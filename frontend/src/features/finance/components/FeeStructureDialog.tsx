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
} from "@mui/material";

import type { AcademicYear, SchoolClass } from "../../../api/academic";
import { showToast } from "../../../app/toast";

export type FeeForm = {
  academic_year_id: string;
  class_id: string;
  name: string;
  amount: string;
  due_date: string;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  years: AcademicYear[];
  classes: SchoolClass[];
  initial: FeeForm;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: { academic_year_id: string; class_id: string; name: string; amount: number; due_date: string | null }) => void;
};

export function FeeStructureDialog(props: Props) {
  const { open, mode, years, classes, initial, saving, onClose, onSubmit } = props;
  const [form, setForm] = useState<FeeForm>(initial);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
  }, [initial, open]);

  const submit = () => {
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!form.academic_year_id || !form.class_id) {
      showToast({ severity: "error", message: "Select academic year and class" });
      return;
    }
    if (!name) {
      showToast({ severity: "error", message: "Name is required" });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      showToast({ severity: "error", message: "Amount must be a whole number" });
      return;
    }
    onSubmit({
      academic_year_id: form.academic_year_id,
      class_id: form.class_id,
      name,
      amount,
      due_date: form.due_date ? form.due_date : null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "create" ? "Create Fee" : "Edit Fee"}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Academic Year</InputLabel>
            <Select
              label="Academic Year"
              value={form.academic_year_id}
              onChange={(e) => setForm((p) => ({ ...p, academic_year_id: e.target.value }))}
              disabled={mode === "edit"}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Class</InputLabel>
            <Select
              label="Class"
              value={form.class_id}
              onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
              disabled={mode === "edit"}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TextField
          fullWidth
          margin="normal"
          label="Name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Amount"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          inputMode="numeric"
        />
        <TextField
          fullWidth
          margin="normal"
          label="Due Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.due_date}
          onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
