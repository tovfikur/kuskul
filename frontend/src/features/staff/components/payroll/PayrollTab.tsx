import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  AttachMoney,
  Receipt,
  PlayArrow,
  CheckCircle,
  Visibility,
  Close,
  CalendarMonth,
  People,
  TrendingUp,
  Edit,
  Payment,
} from "@mui/icons-material";
import {
  listPayrollCycles,
  createPayrollCycle,
  getPayrollCycle,
  processPayrollCycle,
  completePayrollCycle,
  getCyclePayslips,
  listStaff,
  markPayslipPaid,
  updatePayslip,
} from "../../../../api/staffManagement";
import type {
  PayrollCycle,
  PayrollCycleWithStats,
  Payslip,
  Staff,
} from "../../../../api/staffManagement";

export function PayrollTab() {
  // Data State
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<PayrollCycleWithStats | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, Staff>>({});

  // UI State
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");

  // Dialog State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

  // Initial Load
  useEffect(() => {
    loadStaff();
    loadCycles();
  }, [selectedYear]);

  useEffect(() => {
    if (selectedCycleId) {
      loadCycleDetails(selectedCycleId);
    } else {
      setCurrentCycle(null);
      setPayslips([]);
    }
  }, [selectedCycleId]);

  const loadStaff = async () => {
    try {
      const res = await listStaff({ limit: 1000, status: "active" });
      if ((res as any).data?.items) {
        const list = (res as any).data.items;
        setStaffList(list);
        const map: Record<string, Staff> = {};
        list.forEach((s: Staff) => (map[s.id] = s));
        setStaffMap(map);
      }
    } catch (err) {
      console.error("Failed to load staff", err);
    }
  };

  const loadCycles = async () => {
    setLoading(true);
    try {
      const res = await listPayrollCycles({ year: selectedYear, limit: 12 });
      const items = (res as any).items || [];
      setCycles(items);

      // Auto-select current month cycle or first available
      const match = items.find(
        (c: PayrollCycle) => c.month === selectedMonth && c.year === selectedYear
      );
      if (match) {
        setSelectedCycleId(match.id);
      } else if (items.length > 0) {
        setSelectedCycleId(items[0].id);
      } else {
        setSelectedCycleId("");
      }
    } catch (err: any) {
      console.error("Failed to load cycles", err);
      setError("Failed to load payroll cycles");
    } finally {
      setLoading(false);
    }
  };

  const loadCycleDetails = async (id: string) => {
    try {
      const cycleRes = await getPayrollCycle(id);
      setCurrentCycle(cycleRes as any);

      const payslipsRes = await getCyclePayslips(id, { limit: 100 });
      setPayslips((payslipsRes as any).items || []);
    } catch (err) {
      console.error("Failed to load cycle details", err);
    }
  };

  const handleCreateCycle = async () => {
    setProcessing(true);
    setError(null);
    try {
      await createPayrollCycle({
        month: selectedMonth,
        year: selectedYear,
        notes: `Payroll for ${getMonthName(selectedMonth)} ${selectedYear}`,
      });
      await loadCycles();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create cycle. It may already exist.");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCycle = async () => {
    if (!currentCycle) return;
    if (!confirm("Generate payslips for all active staff?")) return;

    setProcessing(true);
    try {
      await processPayrollCycle(currentCycle.id, {
        auto_generate_payslips: true,
        include_inactive_staff: false,
      });
      await loadCycleDetails(currentCycle.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to process payroll");
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteCycle = async () => {
    if (!currentCycle) return;
    if (!confirm("Finalize this payroll cycle? This cannot be undone.")) return;

    setProcessing(true);
    try {
      await completePayrollCycle(currentCycle.id);
      await loadCycleDetails(currentCycle.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to complete cycle");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setEditData({
      basic_salary: payslip.basic_salary,
      allowances: payslip.allowances,
      deductions: payslip.deductions,
      working_days: payslip.working_days,
      present_days: payslip.present_days,
      leave_days: payslip.leave_days,
    });
    setEditMode(false);
    setDetailDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayslip) return;
    setProcessing(true);
    try {
      await updatePayslip(selectedPayslip.id, editData);
      await loadCycleDetails(currentCycle!.id);
      setDetailDialogOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update payslip");
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async (payslipId: string) => {
    if (!confirm("Mark this payslip as paid?")) return;
    try {
      await markPayslipPaid(payslipId, {
        payment_date: new Date().toISOString().split("T")[0],
        payment_reference: `PAY-${Date.now()}`,
      });
      await loadCycleDetails(currentCycle!.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to mark as paid");
    }
  };

  // Helpers
  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString("default", { month: "long" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "default";
      case "processing":
        return "info";
      case "completed":
        return "success";
      case "paid":
        return "success";
      default:
        return "default";
    }
  };

  const cycleForSelectedDate = cycles.find(
    (c) => c.month === selectedMonth && c.year === selectedYear
  );

  const enrichedPayslips = useMemo(() => {
    return payslips.map((p) => {
      const staff = staffMap[p.staff_id];
      return {
        ...p,
        staff_name: staff ? `${staff.first_name} ${staff.last_name}` : "Unknown",
        staff_photo: staff?.profile_photo_url,
        employee_id: staff?.employee_id,
      };
    });
  }, [payslips, staffMap]);

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 180px)", gap: 3, pt: 1 }}>
      {/* LEFT PANEL: Overview (38.2%) */}
      <Paper
        sx={{
          width: "38.2%",
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fff",
        }}
        elevation={2}
      >
        {/* Gradient Header */}
        <Box
          sx={{
            p: 3,
            background: "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)",
            color: "white",
          }}
        >
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Payroll Management
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Process salaries and manage payslips
          </Typography>

          {/* Period Selector */}
          <Box sx={{ mt: 3, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 2, p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CalendarMonth fontSize="small" />
              <Typography variant="body2" fontWeight={500}>
                Payroll Period
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.9)",
                      fontWeight: 600,
                    },
                  }}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(255,255,255,0.9)",
                      fontWeight: 600,
                    },
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <MenuItem key={m} value={m}>
                      {getMonthName(m)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Cycle Stats */}
        {currentCycle ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                CYCLE STATUS
              </Typography>
              <Chip
                label={currentCycle.status.toUpperCase()}
                color={getStatusColor(currentCycle.status) as any}
                size="small"
              />
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ p: 2, bgcolor: "#e8f5e9", borderRadius: 2, textAlign: "center" }}>
                  <AttachMoney sx={{ fontSize: 32, color: "success.main" }} />
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {formatCurrency(currentCycle.total_amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Payroll
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, textAlign: "center" }}>
                  <People sx={{ fontSize: 32, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {currentCycle.payslip_count || payslips.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Staff Members
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ p: 2, bgcolor: "#fff3e0", borderRadius: 2, textAlign: "center" }}>
                  <CheckCircle sx={{ fontSize: 32, color: "warning.main" }} />
                  <Typography variant="h6" fontWeight={700} color="warning.main">
                    {currentCycle.paid_count || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Paid
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ p: 2, bgcolor: "#ffebee", borderRadius: 2, textAlign: "center" }}>
                  <TrendingUp sx={{ fontSize: 32, color: "error.main" }} />
                  <Typography variant="h6" fontWeight={700} color="error.main">
                    {currentCycle.pending_count || payslips.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Actions */}
            <Box sx={{ mt: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
              {currentCycle.status === "draft" && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlayArrow />}
                  onClick={handleProcessCycle}
                  disabled={processing}
                  sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #43a047 0%, #66bb6a 100%)",
                    fontWeight: 600,
                    boxShadow: "0 4px 14px rgba(67, 160, 71, 0.4)",
                  }}
                >
                  {payslips.length > 0 ? "Regenerate Payslips" : "Process Payroll"}
                </Button>
              )}

              {currentCycle.status === "processing" && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CheckCircle />}
                  onClick={handleCompleteCycle}
                  disabled={processing}
                  sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #2e7d32 0%, #43a047 100%)",
                    fontWeight: 600,
                  }}
                >
                  Finalize & Complete
                </Button>
              )}

              <Button
                variant="outlined"
                fullWidth
                onClick={() => loadCycleDetails(currentCycle.id)}
                disabled={processing}
              >
                Refresh Data
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ flex: 1, p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {!cycleForSelectedDate ? (
              <>
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Receipt sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No payroll cycle for this period
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Create a new cycle to get started
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={handleCreateCycle}
                  disabled={processing}
                  sx={{
                    py: 1.5,
                    background: "linear-gradient(90deg, #43a047 0%, #66bb6a 100%)",
                    fontWeight: 600,
                    boxShadow: "0 4px 14px rgba(67, 160, 71, 0.4)",
                  }}
                >
                  Create Payroll Cycle
                </Button>
              </>
            ) : (
              <Alert severity="info">
                Cycle exists with status: <strong>{cycleForSelectedDate.status}</strong>
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* RIGHT PANEL: Payslips List (61.8%) */}
      <Paper
        sx={{
          width: "61.8%",
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#fff",
        }}
        elevation={2}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: "1px solid #f0f0f0" }}>
          <Typography variant="h6" fontWeight={600}>
            Payslips
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {enrichedPayslips.length} payslip{enrichedPayslips.length !== 1 ? "s" : ""} generated
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : enrichedPayslips.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                p: 4,
                textAlign: "center",
              }}
            >
              <Receipt sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No payslips generated yet
              </Typography>
              {currentCycle?.status === "draft" && (
                <Button variant="outlined" onClick={handleProcessCycle} sx={{ mt: 2 }}>
                  Generate Payslips
                </Button>
              )}
            </Box>
          ) : (
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell align="right">Basic</TableCell>
                  <TableCell align="right">Gross</TableCell>
                  <TableCell align="right">Deductions</TableCell>
                  <TableCell align="right">Net Salary</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrichedPayslips.map((payslip: any) => (
                  <TableRow key={payslip.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar src={payslip.staff_photo} sx={{ width: 32, height: 32 }}>
                          {payslip.staff_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {payslip.staff_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payslip.employee_id || "N/A"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(payslip.basic_salary)}</TableCell>
                    <TableCell align="right">{formatCurrency(payslip.gross_salary)}</TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      {formatCurrency(payslip.total_deductions)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(payslip.net_salary)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={payslip.status}
                        size="small"
                        color={payslip.status === "paid" ? "success" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewDetails(payslip)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {payslip.status !== "paid" && currentCycle?.status !== "completed" && (
                        <Tooltip title="Mark Paid">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleMarkPaid(payslip.id)}
                          >
                            <Payment fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Paper>

      {/* Payslip Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Payslip Details
            </Typography>
            {selectedPayslip && (
              <Typography variant="caption" color="text.secondary">
                {staffMap[selectedPayslip.staff_id]?.first_name}{" "}
                {staffMap[selectedPayslip.staff_id]?.last_name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setDetailDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedPayslip && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
              {/* Summary Cards */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      Gross Salary
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {formatCurrency(selectedPayslip.gross_salary)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      Deductions
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      {formatCurrency(selectedPayslip.total_deductions)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
                    <Typography variant="caption" color="text.secondary">
                      Net Salary
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="success.main">
                      {formatCurrency(selectedPayslip.net_salary)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Editable Fields */}
              {editMode ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Basic Salary"
                    type="number"
                    fullWidth
                    value={editData.basic_salary}
                    onChange={(e) =>
                      setEditData({ ...editData, basic_salary: Number(e.target.value) })
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                  />
                  <TextField
                    label="Working Days"
                    type="number"
                    fullWidth
                    value={editData.working_days}
                    onChange={(e) =>
                      setEditData({ ...editData, working_days: Number(e.target.value) })
                    }
                  />
                  <TextField
                    label="Present Days"
                    type="number"
                    fullWidth
                    value={editData.present_days}
                    onChange={(e) =>
                      setEditData({ ...editData, present_days: Number(e.target.value) })
                    }
                  />
                  <TextField
                    label="Leave Days"
                    type="number"
                    fullWidth
                    value={editData.leave_days}
                    onChange={(e) =>
                      setEditData({ ...editData, leave_days: Number(e.target.value) })
                    }
                  />
                  <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                    <Button onClick={() => setEditMode(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveEdit} disabled={processing}>
                      Save Changes
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Salary Breakdown
                    </Typography>
                    {currentCycle?.status !== "completed" && selectedPayslip.status !== "paid" && (
                      <Button size="small" startIcon={<Edit />} onClick={() => setEditMode(true)}>
                        Edit
                      </Button>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Basic Salary
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(selectedPayslip.basic_salary)}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        Payment Method
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedPayslip.payment_method}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Working Days
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedPayslip.working_days}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Present Days
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedPayslip.present_days}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Leave Days
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedPayslip.leave_days}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
