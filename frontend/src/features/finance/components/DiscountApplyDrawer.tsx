import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

import { applyDiscount, removeAllDiscountsForStudent, type Discount } from "../../../api/finance";
import { StudentPicker, type StudentOption } from "./StudentPicker";
import { showToast } from "../../../app/toast";

type Props = {
  open: boolean;
  onClose: () => void;
  discounts: Discount[];
  onApplied: () => void;
};

export function DiscountApplyDrawer(props: Props) {
  const { open, onClose, discounts, onApplied } = props;
  const [student, setStudent] = useState<StudentOption | null>(null);
  const [discountId, setDiscountId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const discountById = useMemo(
    () => new Map(discounts.map((d) => [d.id, d])),
    [discounts],
  );

  const selected = discountById.get(discountId) ?? null;

  const doApply = async () => {
    if (!student) {
      showToast({ severity: "error", message: "Select a student" });
      return;
    }
    if (!discountId) {
      showToast({ severity: "error", message: "Select a discount" });
      return;
    }
    setSaving(true);
    try {
      await applyDiscount({ student_id: student.id, discount_id: discountId });
      onApplied();
      onClose();
    } catch {
      showToast({ severity: "error", message: "Failed to apply discount" });
    } finally {
      setSaving(false);
    }
  };

  const doRemoveAll = async () => {
    if (!student) {
      showToast({ severity: "error", message: "Select a student" });
      return;
    }
    if (!confirm("Remove all discounts for this student?")) return;
    setSaving(true);
    try {
      await removeAllDiscountsForStudent(student.id);
      onApplied();
      onClose();
    } catch {
      showToast({ severity: "error", message: "Failed to remove discounts" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 380, p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Apply Discount
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          Attach a discount to a student. Dues are updated after recalculation.
        </Typography>

        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <StudentPicker label="Student" value={student} onChange={setStudent} />
          <FormControl fullWidth>
            <InputLabel>Discount</InputLabel>
            <Select value={discountId} label="Discount" onChange={(e) => setDiscountId(e.target.value)}>
              <MenuItem value="">Select...</MenuItem>
              {discounts.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selected && (
            <Typography variant="body2" color="text.secondary">
              {selected.discount_type === "percent" ? `${selected.value}%` : `${selected.value}`} •{" "}
              {selected.description || "No description"}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" color="warning" onClick={() => void doRemoveAll()} disabled={saving}>
            Remove All
          </Button>
          <Button variant="contained" onClick={() => void doApply()} disabled={saving}>
            Apply
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

