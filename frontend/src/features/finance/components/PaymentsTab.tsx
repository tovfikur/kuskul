import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ReplayIcon from "@mui/icons-material/Replay";
import UndoIcon from "@mui/icons-material/Undo";

import {
  downloadReceipt,
  getFeePayments,
  refundFee,
  type FeePayment,
} from "../../../api/finance";
import { getStudentsBatch, type Student } from "../../../api/people";
import { showToast } from "../../../app/toast";
import { CollectPaymentDialog } from "./CollectPaymentDialog";
import { downloadBlob, formatMoney, shortId } from "../financeUtils";

type Props = {
  openCollect: boolean;
  onCloseCollect: () => void;
  onOpenCollect?: () => void;
};

export function PaymentsTab(props: Props) {
  const { openCollect, onCloseCollect, onOpenCollect } = props;

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [method, setMethod] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FeePayment[]>([]);
  const [studentById, setStudentById] = useState<Record<string, Student>>({});

  const paidCount = useMemo(
    () => rows.filter((r) => !r.is_refund).length,
    [rows],
  );
  const refundCount = useMemo(
    () => rows.filter((r) => r.is_refund).length,
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getFeePayments({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        payment_method: method || undefined,
      });
      setRows(list);
    } catch {
      showToast({ severity: "error", message: "Failed to load payments" });
    } finally {
      setLoading(false);
    }
  }, [endDate, method, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ids = Array.from(new Set(rows.map((r) => r.student_id)));
    const missing = ids.filter((id) => !studentById[id]);
    if (missing.length === 0) return;
    let alive = true;
    void getStudentsBatch(missing).then((items) => {
      if (!alive) return;
      const next = { ...studentById };
      for (const s of items) {
        next[s.id] = s;
      }
      setStudentById(next);
    });
    return () => {
      alive = false;
    };
  }, [rows, studentById]);

  const studentLabel = (id: string): string => {
    const s = studentById[id];
    if (!s) return shortId(id);
    const name = [s.first_name, s.last_name || ""].filter(Boolean).join(" ").trim();
    return s.admission_no ? `${name} (${s.admission_no})` : name;
  };

  const onDownload = async (paymentId: string) => {
    try {
      const blob = await downloadReceipt(paymentId);
      downloadBlob(blob, `receipt_${paymentId}.txt`);
    } catch {
      showToast({ severity: "error", message: "Failed to download receipt" });
    }
  };

  const onRefund = async (paymentId: string) => {
    if (!confirm("Refund this payment?")) return;
    try {
      await refundFee(paymentId);
      await load();
    } catch {
      showToast({ severity: "error", message: "Failed to refund payment" });
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Payments
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
              <Chip size="small" label={`Payments: ${paidCount}`} color="success" variant="outlined" />
              <Chip size="small" label={`Refunds: ${refundCount}`} color="warning" variant="outlined" />
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Start
              </Typography>
              <Box
                component="input"
                value={startDate}
                onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                type="date"
                style={{ height: 40, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                End
              </Typography>
              <Box
                component="input"
                value={endDate}
                onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
                type="date"
                style={{ height: 40, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
            </Box>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Method</InputLabel>
              <Select value={method} label="Method" onChange={(e) => setMethod(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank">Bank</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="mobile">Mobile</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => void load()} disabled={loading}>
              Reload
            </Button>
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={() => onOpenCollect?.()}
            >
              Collect Payment
            </Button>
          </Box>
        </Box>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Student</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.payment_date}</TableCell>
                  <TableCell>{studentLabel(r.student_id)}</TableCell>
                  <TableCell align="right">{formatMoney(r.amount)}</TableCell>
                  <TableCell>{r.payment_method ?? "—"}</TableCell>
                  <TableCell>{r.reference ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={r.is_refund ? "Refund" : "Payment"}
                      color={r.is_refund ? "warning" : "success"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="text" onClick={() => void onDownload(r.id)}>
                      Receipt
                    </Button>
                    {!r.is_refund && (
                      <Button
                        size="small"
                        variant="text"
                        color="warning"
                        startIcon={<UndoIcon />}
                        onClick={() => void onRefund(r.id)}
                      >
                        Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>No payments found.</TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7}>Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CollectPaymentDialog
        open={openCollect}
        onClose={onCloseCollect}
        onCollected={() => {
          void load();
        }}
      />
    </Box>
  );
}
