import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Dialog,
  DialogContent,
  Chip,
  Alert,
  Avatar,
  CircularProgress,
  IconButton,
  InputAdornment
} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
  EventNote,
  Search,
  Close
} from "@mui/icons-material";
import {
  listStaff,
  listLeaveTypes,
  listLeaveRequests,
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getLeaveBalanceSummary,
  getStaffLeaveBalances,
  getStaffLeaveRequests,
  type Staff,
  type LeaveType,
  type LeaveBalance,
  type StaffLeaveRequest
} from "../../../../api/staffManagement";

export default function LeaveTab() {
  // Data State
  const [requests, setRequests] = useState<StaffLeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<{
    total_pending?: number;
    total_used?: number;
    total_approved?: number;
    total_rejected?: number;
  } | null>(null);
  
  // Maps for quick lookup
  const [staffMap, setStaffMap] = useState<Record<string, Staff>>({});
  const [typeMap, setTypeMap] = useState<Record<string, LeaveType>>({});

  // UI State
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    leave_type_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedStaffBalances, setSelectedStaffBalances] = useState<LeaveBalance[]>([]);
  const [selectedStaffRequests, setSelectedStaffRequests] = useState<StaffLeaveRequest[]>([]);
  const [selectedStaffBalancesLoading, setSelectedStaffBalancesLoading] = useState(false);

  const extractItems = <T,>(data: unknown): T[] => {
    if (data && typeof data === "object" && "items" in data) {
      const items = (data as { items?: unknown }).items;
      if (Array.isArray(items)) return items as T[];
    }
    return [];
  };

  const loadMetadata = useCallback(async () => {
    try {
      const sRes = await listStaff({ limit: 1000, status: "active" });
      if (sRes.ok && sRes.data) {
        const list = extractItems<Staff>(sRes.data);
        setStaffList(list);
        const map: Record<string, Staff> = {};
        list.forEach((s) => {
          map[s.id] = s;
        });
        setStaffMap(map);
      }

      const tRes = await listLeaveTypes({});
      if (tRes.ok && tRes.data) {
        const tData = Array.isArray(tRes.data)
          ? (tRes.data as LeaveType[])
          : extractItems<LeaveType>(tRes.data);
        setLeaveTypes(tData);
        const map: Record<string, LeaveType> = {};
        tData.forEach((t) => {
          map[t.id] = t;
        });
        setTypeMap(map);
      }
    } catch (e) {
      console.error("Failed to load metadata", e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await getLeaveBalanceSummary(new Date().getFullYear());
      if (res.ok && res.data && typeof res.data === "object") {
        setBalanceSummary(
          res.data as {
            total_pending?: number;
            total_used?: number;
            total_approved?: number;
            total_rejected?: number;
          },
        );
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listLeaveRequests({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        leave_type_id: typeFilter || undefined,
      });
      
      if (res.ok && res.data && typeof res.data === "object") {
        const data = res.data as { items?: StaffLeaveRequest[]; total?: number };
        if (Array.isArray(data.items)) setRequests(data.items);
        if (typeof data.total === "number") setTotal(data.total);
      }
    } catch (e) {
      console.error("Failed to load requests", e);
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, typeFilter]);

  useEffect(() => {
    loadMetadata();
    loadRequests();
    loadStats();
  }, [loadMetadata, loadRequests, loadStats]);

  useEffect(() => {
    let active = true;

    if (!formData.staff_id) {
      setSelectedStaffBalances([]);
      setSelectedStaffRequests([]);
      return undefined;
    }

    setSelectedStaffBalancesLoading(true);
    (async () => {
      try {
        const year = new Date(formData.start_date).getFullYear();
        const [balancesRes, requestsRes] = await Promise.all([
          getStaffLeaveBalances(formData.staff_id, year),
          getStaffLeaveRequests(formData.staff_id, year),
        ]);
        if (!active) return;

        if (balancesRes.ok && Array.isArray(balancesRes.data)) {
          setSelectedStaffBalances(balancesRes.data as LeaveBalance[]);
        } else {
          setSelectedStaffBalances([]);
        }

        if (requestsRes.ok && Array.isArray(requestsRes.data)) {
          setSelectedStaffRequests(requestsRes.data);
        } else {
          setSelectedStaffRequests([]);
        }
      } catch (e) {
        console.error("Failed to load staff leave counts", e);
        if (active) {
          setSelectedStaffBalances([]);
          setSelectedStaffRequests([]);
        }
      } finally {
        if (active) setSelectedStaffBalancesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [formData.staff_id, formData.start_date]);

  const selectedStaffBalanceCards = useMemo(() => {
    const targets = [
      {
        label: "Casual Leave",
        gradient: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
      },
      {
        label: "Sick Leave",
        gradient: "linear-gradient(135deg, #16a34a 0%, #84cc16 100%)",
      },
      {
        label: "Pregnancy Leave",
        gradient: "linear-gradient(135deg, #db2777 0%, #f97316 100%)",
      },
    ];

    return targets.map((target) => {
      const type = leaveTypes.find((leaveType) =>
        leaveType.name.toLowerCase().includes(target.label.toLowerCase().replace(" leave", "")),
      );
      const balance = type
        ? selectedStaffBalances.find((item) => item.leave_type_id === type.id)
        : undefined;
      const matchingRequests = type
        ? selectedStaffRequests.filter((request) => request.leave_type_id === type.id)
        : [];
      const used = matchingRequests
        .filter((request) => request.status === "approved")
        .reduce((sum, request) => sum + request.total_days, 0);
      const pending = matchingRequests
        .filter((request) => request.status === "pending")
        .reduce((sum, request) => sum + request.total_days, 0);
      const total = balance
        ? balance.total_days + balance.carried_forward
        : type?.days_per_year ?? 0;
      const available = Math.max(total - used - pending, 0);

      return {
        ...target,
        total,
        available,
        used,
        pending,
      };
    });
  }, [leaveTypes, selectedStaffBalances, selectedStaffRequests]);

  const handleCreate = async () => {
    setError(null);
    if (!formData.staff_id || !formData.leave_type_id || !formData.reason) {
      setError("Please fill all required fields");
      return;
    }

    setActionLoading(true);
    try {
      await createLeaveRequest(formData);
      setDialogOpen(false);
      loadRequests();
      loadStats(); // refresh stats
      // Reset form
      setFormData({
        staff_id: "",
        leave_type_id: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        reason: "",
      });
    } catch (err) {
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: unknown } }).response;
        const data = response?.data;
        if (data && typeof data === "object" && "detail" in data) {
          const detail = (data as { detail?: unknown }).detail;
          if (typeof detail === "string") {
            setError(detail);
          } else {
            setError("Failed to create request");
          }
        } else {
          setError("Failed to create request");
        }
      } else {
        setError("Failed to create request");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;
    
    let reason = "";
    if (action === "reject") {
        reason = prompt("Please enter rejection reason:") || "";
        if (!reason) return;
    }

    try {
        if (action === "approve") await approveLeaveRequest(id);
        else await rejectLeaveRequest(id, reason);
        loadRequests();
        loadStats();
    } catch (err) {
      if (err && typeof err === "object" && "response" in err) {
        const response = (err as { response?: { data?: unknown } }).response;
        const data = response?.data;
        if (data && typeof data === "object" && "detail" in data) {
          const detail = (data as { detail?: unknown }).detail;
          if (typeof detail === "string") {
            alert(detail);
          } else {
            alert("Action failed");
          }
        } else {
          alert("Action failed");
        }
      } else {
        alert("Action failed");
      }
    }
  };

  // Helper to enrich request data
  const enrich = (req: StaffLeaveRequest) => {
    const staff = staffMap[req.staff_id];
    const type = typeMap[req.leave_type_id];
    return {
        ...req,
        staff_name: staff ? `${staff.first_name} ${staff.last_name}` : "Unknown Staff",
        staff_photo: staff?.profile_photo_url,
        type_name: type?.name || "Unknown Type",
        type_color: type?.color || "#9e9e9e"
    };
  };

  // Filter local search if needed (API search not supported in listLeaveRequests for string query yet)
  // listLeaveRequests supports 'status', 'leave_type_id' but not generic 'search'.
  // So we filter locally for search term.
  const displayRequests = useMemo(() => {
    let list = requests.map(enrich);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(r => r.staff_name.toLowerCase().includes(q));
    }
    return list;
  }, [requests, staffMap, typeMap, searchQuery]);

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 180px)", gap: 3, pt: 1 }}>
      
      {/* LEFT PANEL: Overview & Quick apply (38.2%) */}
      <Paper sx={{ 
        width: "38.2%", 
        borderRadius: 3, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: "#fff"
      }} elevation={2}>
         
         {/* Gradient Header */}
         <Box sx={{ p: 3, background: "linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)", color: "white" }}>
            <Typography variant="h6" fontWeight={700}>Leave Management</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Track and manage staff time off</Typography>
            
            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
               <Box sx={{ flex: 1, p: 2, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700}>{balanceSummary?.total_pending || 0}</Typography>
                  <Typography variant="caption" fontWeight={500}>Pending Requests</Typography>
               </Box>
               <Box sx={{ flex: 1, p: 2, bgcolor: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight={700}>{balanceSummary?.total_used || 0}</Typography>
                  <Typography variant="caption" fontWeight={500}>Taken This Year</Typography>
               </Box>
            </Box>
         </Box>

         {/* Actions & Balance List */}
         <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
             <Button 
                variant="contained" 
                fullWidth 
                startIcon={<Add />}
                onClick={() => setDialogOpen(true)}
                sx={{ 
                    py: 1.5, 
                    mb: 4, 
                    background: "linear-gradient(90deg, #FF6B6B 0%, #FF8E53 100%)",
                    fontWeight: 600,
                    boxShadow: "0 4px 14px rgba(255, 107, 107, 0.4)"
                }}
             >
                New Leave Request
             </Button>

             <Typography variant="subtitle2" fontWeight={600} color="text.secondary" gutterBottom>
               Leave Types & Allowance
             </Typography>

             <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
                {leaveTypes.map(lt => (
                    <Box key={lt.id} sx={{ display: "flex", alignItems: "center", gap: 2, p: 1.5, border: "1px solid #f0f0f0", borderRadius: 2 }}>
                        <Avatar sx={{ bgcolor: lt.color + "20", color: lt.color }}>
                            {lt.name[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{lt.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{lt.days_per_year} days/year</Typography>
                        </Box>
                        {lt.requires_approval && <Chip label="Approval" size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
                    </Box>
                ))}
             </Box>
         </Box>
      </Paper>

      {/* RIGHT PANEL: List (61.8%) */}
      <Paper sx={{ 
        width: "61.8%", 
        borderRadius: 3, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: "#fff"
      }} elevation={2}>
        
        {/* Toolbar */}
        <Box sx={{ p: 2, borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 2 }}>
           <TextField
               size="small"
               placeholder="Search staff..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               InputProps={{
                 startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
               }}
               sx={{ flex: 1 }}
           />
           <TextField
              select
              size="small"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ width: 140 }}
              SelectProps={{ displayEmpty: true }}
           >
              <MenuItem value="">All Types</MenuItem>
              {leaveTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
           </TextField>
           <TextField 
              select 
              size="small" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ width: 140 }}
              SelectProps={{ displayEmpty: true }}
           >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
           </TextField>
        </Box>

        {/* Requests List */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
            {loading ? (
                <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
            ) : displayRequests.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                    <EventNote sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                    <Typography>No leave requests found</Typography>
                </Box>
            ) : (
                <Table stickyHeader>
                   <TableHead>
                      <TableRow>
                         <TableCell>Staff</TableCell>
                         <TableCell>Type</TableCell>
                         <TableCell>Dates</TableCell>
                         <TableCell>Status</TableCell>
                         <TableCell align="right">Actions</TableCell>
                      </TableRow>
                   </TableHead>
                   <TableBody>
                      {displayRequests.map((req) => (
                          <TableRow key={req.id} hover>
                              <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                      <Avatar src={req.staff_photo} sx={{ width: 32, height: 32 }}>{req.staff_name[0]}</Avatar>
                                      <Box>
                                          <Typography variant="body2" fontWeight={600}>{req.staff_name}</Typography>
                                          <Typography variant="caption" color="text.secondary">{req.reason}</Typography>
                                      </Box>
                                  </Box>
                              </TableCell>
                              <TableCell>
                                  <Chip 
                                    label={req.type_name} 
                                    size="small" 
                                    sx={{ 
                                        bgcolor: req.type_color + "15", 
                                        color: req.type_color, 
                                        fontWeight: 600,
                                        border: `1px solid ${req.type_color}40`
                                    }} 
                                  />
                              </TableCell>
                              <TableCell>
                                  <Typography variant="body2">{req.start_date}</Typography>
                                  <Typography variant="caption" color="text.secondary">{req.total_days} days</Typography>
                              </TableCell>
                              <TableCell>
                                  <Chip 
                                    label={req.status} 
                                    size="small"
                                    color={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'error'} 
                                    sx={{ textTransform: "capitalize" }}
                                  />
                              </TableCell>
                              <TableCell align="right">
                                  {req.status === 'pending' && (
                                     <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                         <IconButton size="small" color="success" onClick={() => handleAction(req.id, "approve")}>
                                              <CheckCircle fontSize="small" />
                                          </IconButton>
                                          <IconButton size="small" color="error" onClick={() => handleAction(req.id, "reject")}>
                                              <Cancel fontSize="small" />
                                          </IconButton>
                                     </Box>
                                  )}
                              </TableCell>
                          </TableRow>
                      ))}
                   </TableBody>
                </Table>
            )}
        </Box>
        <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
        />
      </Paper>

      {/* Create Dialog - Golden Ratio Split */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
          <DialogContent sx={{ p: 0, display: "flex", height: 560, overflow: "hidden" }}>
              
              {/* Left Panel: Selected Staff Balance */}
              <Box sx={{ 
                  width: "38.2%", 
                  bgcolor: "#f8fafc",
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "1px solid #e0e0e0",
                  overflowY: "auto"
              }}>
                   <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                      LEAVE BALANCE
                   </Typography>
                   <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {formData.staff_id
                        ? "Remaining leave count for the selected employee."
                        : "Select a staff member to view remaining leave count."}
                   </Typography>

                   {selectedStaffBalancesLoading ? (
                      <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={28} />
                      </Box>
                   ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {selectedStaffBalanceCards.map((card) => (
                          <Box
                            key={card.label}
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              color: "white",
                              background: card.gradient,
                              boxShadow: "0 10px 24px rgba(15,23,42,0.16)",
                            }}
                          >
                            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700 }}>
                              {card.label.toUpperCase()}
                            </Typography>
                            <Box sx={{ mt: 1, display: "flex", alignItems: "flex-end", gap: 1 }}>
                              <Typography variant="h4" fontWeight={800}>
                                {card.available}
                              </Typography>
                              <Typography variant="body2" sx={{ pb: 0.5, opacity: 0.85 }}>
                                left
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 1.5, display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Used {card.used}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Pending {card.pending}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Total {card.total}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                   )}
              </Box>

              {/* Right Panel: Structured Data (61.8%) */}
              <Box sx={{ width: "61.8%", p: 4, bgcolor: "#fff", display: "flex", flexDirection: "column", position: "relative", overflowY: "auto" }}>
                  <IconButton onClick={() => setDialogOpen(false)} sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}>
                      <Close />
                  </IconButton>

                  <Box sx={{ mb: 4 }}>
                      <Typography variant="h5" fontWeight={700}>New Request</Typography>
                      <Typography variant="body2" color="text.secondary">Select staff and dates.</Typography>
                  </Box>
                  
                  {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <TextField 
                          select 
                          fullWidth 
                          label="Staff Member" 
                          value={formData.staff_id}
                          onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                          size="small"
                      >
                          {staffList.map(s => (
                              <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.employee_id})</MenuItem>
                          ))}
                      </TextField>

                      <TextField 
                          select 
                          fullWidth 
                          label="Leave Type" 
                          value={formData.leave_type_id}
                          onChange={(e) => setFormData({...formData, leave_type_id: e.target.value})}
                          size="small"
                      >
                          {leaveTypes.map(t => (
                              <MenuItem key={t.id} value={t.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: t.color }} />
                                    {t.name}
                                </Box>
                              </MenuItem>
                          ))}
                      </TextField>

                      <TextField
                          multiline
                          fullWidth
                          minRows={4}
                          label="Reason for Leave"
                          placeholder="Please describe the reason for your leave request in detail..."
                          value={formData.reason}
                          onChange={(e) => setFormData({...formData, reason: e.target.value})}
                          size="small"
                      />

                      <Box sx={{ display: "flex", gap: 2 }}>
                          <TextField 
                              type="date" 
                              fullWidth 
                              label="Start Date" 
                              InputLabelProps={{ shrink: true }}
                              value={formData.start_date}
                              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                              size="small"
                          />
                          <TextField 
                              type="date" 
                              fullWidth 
                              label="End Date" 
                              InputLabelProps={{ shrink: true }}
                              value={formData.end_date}
                              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                              size="small"
                          />
                      </Box>
                  </Box>

                  <Box sx={{ mt: "auto", display: "flex", justifyContent: "flex-end", gap: 2 }}>
                      <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
                      <Button 
                        variant="contained" 
                        onClick={handleCreate} 
                        disabled={actionLoading}
                        sx={{ background: "linear-gradient(90deg, #FF6B6B 0%, #FF8E53 100%)", boxShadow: "0 4px 12px rgba(255,107,107,0.3)" }}
                      >
                          {actionLoading ? "Submitting..." : "Submit Request"}
                      </Button>
                  </Box>
              </Box>
          </DialogContent>
      </Dialog>
    </Box>
  );
}
