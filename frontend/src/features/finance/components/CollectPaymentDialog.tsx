import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";

import { collectFee } from "../../../api/finance";
import {
  getAcademicYears,
  getCurrentAcademicYear,
  type AcademicYear,
} from "../../../api/academic";
import { StudentPicker, type StudentOption } from "./StudentPicker";
import { isoDate } from "../financeUtils";
import { showToast } from "../../../app/toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onCollected: () => void;
};

export function CollectPaymentDialog(props: Props) {
  const { open, onClose, onCollected } = props;

  const [years, setYears] = useState<AcademicYear[]>([]);
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(isoDate(new Date()));
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("cash");
  const [reference, setReference] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void Promise.all([getAcademicYears(), getCurrentAcademicYear()])
      .then(([y, current]) => {
        setYears(y);
        setAcademicYearId(current.id);
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load academic years" });
      });
  }, [open]);

  const submit = async () => {
    const amt = Number(amount);
    if (!student) {
      showToast({ severity: "error", message: "Select a student" });
      return;
    }
    if (!academicYearId) {
      showToast({ severity: "error", message: "Select an academic year" });
      return;
    }
    if (!Number.isFinite(amt) || !Number.isInteger(amt) || amt <= 0) {
      showToast({ severity: "error", message: "Amount must be a whole number" });
      return;
    }
    if (reference.trim().length > 128) {
      showToast({ severity: "error", message: "Reference must be at most 128 characters" });
      return;
    }

    setSaving(true);
    try {
      await collectFee({
        student_id: student.id,
        academic_year_id: academicYearId,
        payment_date: paymentDate,
        amount: amt,
        payment_method: method || null,
        reference: reference.trim() || null,
      });
      onClose();
      onCollected();
      setStudent(null);
      setAmount("");
      setReference("");
    } catch {
      showToast({ severity: "error", message: "Failed to collect payment" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Collect Payment</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Record a payment for a student and academic year.
        </Typography>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <StudentPicker label="Student" value={student} onChange={setStudent} />
          <FormControl fullWidth>
            <InputLabel>Academic Year</InputLabel>
            <Select
              label="Academic Year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              label="Payment date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              sx={{ flex: "1 1 220px" }}
            />
            <TextField
              label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              sx={{ flex: "1 1 220px" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl sx={{ flex: "1 1 220px" }}>
              <InputLabel>Method</InputLabel>
              <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank">Bank</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="mobile">Mobile</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              sx={{ flex: "1 1 220px" }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

