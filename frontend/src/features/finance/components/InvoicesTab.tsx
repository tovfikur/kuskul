import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

import {
  downloadReceipt,
  getFeeDues,
  getFeePayments,
  type FeeDue,
  type FeePayment,
} from "../../../api/finance";
import {
  getAcademicYears,
  getClasses,
  getCurrentAcademicYear,
  type AcademicYear,
  type SchoolClass,
} from "../../../api/academic";
import { getStudentsBatch, type Student } from "../../../api/people";
import { showToast } from "../../../app/toast";
import { downloadBlob, formatMoney, shortId } from "../financeUtils";

type Status = "" | "paid" | "partial" | "due" | "overdue";

export function InvoicesTab() {
  const [params, setParams] = useSearchParams();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [status, setStatus] = useState<Status>("");
  const [search, setSearch] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FeeDue[]>([]);
  const [studentById, setStudentById] = useState<Record<string, Student>>({});

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<FeeDue | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [payments, setPayments] = useState<FeePayment[]>([]);

  useEffect(() => {
    void Promise.all([
      getClasses(),
      getAcademicYears(),
      getCurrentAcademicYear(),
    ])
      .then(([c, y, current]) => {
        setClasses(c.filter((x) => x.is_active));
        setYears(y);
        setYearId(current.id);
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load master data" });
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getFeeDues({
        academic_year_id: yearId || undefined,
        class_id: classId || undefined,
        status: status || undefined,
      });
      setRows(list);
    } catch {
      showToast({
        severity: "error",
        message: "Failed to load invoice lifecycle (dues)",
      });
    } finally {
      setLoading(false);
    }
  }, [classId, status, yearId]);

  useEffect(() => {
    if (!yearId) return;
    void load();
  }, [load, yearId]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map((r) => r.student_id)));
    const missing = ids.filter((id) => !studentById[id]);
    if (missing.length === 0) return;
    let alive = true;
    void getStudentsBatch(missing).then((items) => {
      if (!alive) return;
      const next = { ...studentById };
      for (const s of items) next[s.id] = s;
      setStudentById(next);
    });
    return () => {
      alive = false;
    };
  }, [rows, studentById]);

  const studentLabel = useCallback(
    (id: string): string => {
      const s = studentById[id];
      if (!s) return shortId(id);
      const name = [s.first_name, s.last_name || ""]
        .filter(Boolean)
        .join(" ")
        .trim();
      return s.admission_no ? `${name} (${s.admission_no})` : name;
    },
    [studentById],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      studentLabel(r.student_id).toLowerCase().includes(q),
    );
  }, [rows, search, studentLabel]);

  const counts = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid").length;
    const partial = rows.filter((r) => r.status === "partial").length;
    const due = rows.filter((r) => r.status === "due").length;
    const overdue = rows.filter((r) => r.status === "overdue").length;
    return { paid, partial, due, overdue };
  }, [rows]);

  const openDetail = async (r: FeeDue) => {
    setSelected(r);
    setDetailOpen(true);
    setPayments([]);
    setPaymentsLoading(true);
    try {
      const list = await getFeePayments({ student_id: r.student_id });
      setPayments(list);
    } catch {
      showToast({
        severity: "error",
        message: "Failed to load payment history",
      });
    } finally {
      setPaymentsLoading(false);
    }
  };

  const onReceipt = async (paymentId: string) => {
    try {
      const blob = await downloadReceipt(paymentId);
      downloadBlob(blob, `receipt_${paymentId}.txt`);
    } catch {
      showToast({ severity: "error", message: "Failed to download receipt" });
    }
  };

  const gotoTab = (k: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", k);
    setParams(next, { replace: true });
  };

  const gotoCollect = (studentId: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", "payments");
    next.set("collect", "1");
    next.set("student_id", studentId);
    setParams(next, { replace: true });
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Invoices
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            Issue invoices and track invoice lifecycle.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={`Paid: ${counts.paid}`}
              color="success"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Partial: ${counts.partial}`}
              color="warning"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Due: ${counts.due}`}
              color="info"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Overdue: ${counts.overdue}`}
              color="error"
              variant="outlined"
            />
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          <Button variant="outlined" onClick={() => gotoTab("fees")}>
            Fee Structures
          </Button>
          <Button variant="outlined" onClick={() => gotoTab("payments")}>
            Payments
          </Button>
          <Button variant="outlined" onClick={() => gotoTab("dues")}>
            Dues
          </Button>
          <Button variant="outlined" onClick={() => gotoTab("discounts")}>
            Discounts
          </Button>
          <Button variant="outlined" onClick={() => gotoTab("reports")}>
            Reports
          </Button>
          <Button
            variant="contained"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Academic Year</InputLabel>
          <Select
            label="Academic Year"
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
          >
            {years.map((y) => (
              <MenuItem key={y.id} value={y.id}>
                {y.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Class</InputLabel>
          <Select
            label="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {classes.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="partial">Partial</MenuItem>
            <MenuItem value="due">Due</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 260 }}>
          <TextField
            label="Search student"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormControl>
      </Box>

      <Box sx={{ mt: 2 }}>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell align="right">Total Fee</TableCell>
                <TableCell align="right">Discount</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Due</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading…" : "No invoices found."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{studentLabel(r.student_id)}</TableCell>
                    <TableCell align="right">
                      {formatMoney(r.total_fee)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(r.discount_amount)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(r.paid_amount)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(r.due_amount)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={r.status}
                        color={
                          r.status === "paid"
                            ? "success"
                            : r.status === "partial"
                              ? "warning"
                              : r.status === "overdue"
                                ? "error"
                                : "info"
                        }
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<ReceiptLongIcon />}
                        onClick={() => void openDetail(r)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              alignItems: { sm: "center" },
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Invoice Detail</Typography>
              <Typography variant="body2" color="text.secondary">
                {selected ? studentLabel(selected.student_id) : ""}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => {
                if (!selected) return;
                setDetailOpen(false);
                gotoCollect(selected.student_id);
              }}
            >
              Collect Payment
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selected ? (
            <>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: "wrap", mb: 2 }}
              >
                <Chip
                  size="small"
                  label={`Total: ${formatMoney(selected.total_fee)}`}
                />
                <Chip
                  size="small"
                  label={`Discount: ${formatMoney(selected.discount_amount)}`}
                />
                <Chip
                  size="small"
                  label={`Paid: ${formatMoney(selected.paid_amount)}`}
                />
                <Chip
                  size="small"
                  label={`Balance: ${formatMoney(selected.due_amount)}`}
                />
                <Chip size="small" label={`Status: ${selected.status}`} />
              </Stack>

              <Typography sx={{ fontWeight: 800, mb: 1 }}>
                Payment History
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            {paymentsLoading
                              ? "Loading…"
                              : "No payments found."}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date?.slice(0, 10)}</TableCell>
                          <TableCell align="right">
                            {p.is_refund ? "-" : ""}
                            {formatMoney(p.amount)}
                          </TableCell>
                          <TableCell>{p.payment_method || "—"}</TableCell>
                          <TableCell>{p.reference || "—"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={p.is_refund ? "Refund" : "Paid"}
                              color={p.is_refund ? "warning" : "success"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => void onReceipt(p.id)}
                              disabled={p.is_refund}
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select an invoice row.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}
