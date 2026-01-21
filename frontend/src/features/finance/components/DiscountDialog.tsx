import {
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
import { useEffect, useState } from "react";

import { showToast } from "../../../app/toast";

export type DiscountForm = {
  name: string;
  discount_type: "percent" | "fixed";
  value: string;
  description: string;
};

type Props = {
  open: boolean;
  title: string;
  initial: DiscountForm;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; discount_type: "percent" | "fixed"; value: number; description: string | null }) => void;
};

export function DiscountDialog(props: Props) {
  const { open, title, initial, saving, onClose, onSubmit } = props;
  const [form, setForm] = useState<DiscountForm>(initial);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
  }, [initial, open]);

  const submit = () => {
    const name = form.name.trim();
    const val = Number(form.value);
    if (!name) {
      showToast({ severity: "error", message: "Name is required" });
      return;
    }
    if (!Number.isFinite(val) || val <= 0) {
      showToast({ severity: "error", message: "Value must be a positive number" });
      return;
    }
    if (form.discount_type === "percent" && val > 100) {
      showToast({ severity: "error", message: "Percent must be 0–100" });
      return;
    }
    onSubmit({
      name,
      discount_type: form.discount_type,
      value: val,
      description: form.description.trim() || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          margin="normal"
          label="Name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={form.discount_type}
            onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as "percent" | "fixed" }))}
          >
            <MenuItem value="percent">Percent</MenuItem>
            <MenuItem value="fixed">Fixed</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          label="Value"
          value={form.value}
          onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
          inputMode="decimal"
        />
        <TextField
          fullWidth
          margin="normal"
          label="Description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          multiline
          minRows={2}
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

