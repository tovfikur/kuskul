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
import { useEffect, useMemo, useState } from "react";

import {
  applyDiscount,
  calculateDues,
  removeAllDiscountsForStudent,
  type Discount,
} from "../../../api/finance";
import {
  getClasses,
  getSections,
  type SchoolClass,
  type Section,
} from "../../../api/academic";
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
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [discountId, setDiscountId] = useState<string>("");
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void getClasses()
      .then((items) => {
        if (!alive) return;
        setClasses(items.filter((item) => item.is_active));
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load classes" });
      });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      return;
    }

    let alive = true;
    setSectionsLoading(true);
    void getSections(classId)
      .then((items) => {
        if (!alive) return;
        setSections(items.filter((item) => item.is_active));
      })
      .catch(() => {
        showToast({ severity: "error", message: "Failed to load sections" });
      })
      .finally(() => {
        if (!alive) return;
        setSectionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [classId]);

  const discountById = useMemo(
    () => new Map(discounts.map((d) => [d.id, d])),
    [discounts],
  );

  const selected = discountById.get(discountId) ?? null;

  const doApply = async () => {
    if (!classId) {
      showToast({ severity: "error", message: "Select a class" });
      return;
    }
    if (!sectionId) {
      showToast({ severity: "error", message: "Select a section" });
      return;
    }
    if (students.length === 0) {
      showToast({ severity: "error", message: "Select at least one student" });
      return;
    }
    if (!discountId) {
      showToast({ severity: "error", message: "Select a discount" });
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        students.map((student) =>
          applyDiscount({ student_id: student.id, discount_id: discountId }),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        showToast({
          severity: failed.length === students.length ? "error" : "warning",
          message:
            failed.length === students.length
              ? "Failed to apply discount"
              : `Applied discount to ${students.length - failed.length} student(s); ${failed.length} failed`,
        });
        if (failed.length === students.length) return;
      }
      await calculateDues();
      onApplied();
      onClose();
    } catch {
      showToast({ severity: "error", message: "Failed to apply discount" });
    } finally {
      setSaving(false);
    }
  };

  const doRemoveAll = async () => {
    if (students.length === 0) {
      showToast({ severity: "error", message: "Select at least one student" });
      return;
    }
    if (!confirm(`Remove all discounts for ${students.length} selected student(s)?`)) {
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        students.map((student) => removeAllDiscountsForStudent(student.id)),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        showToast({
          severity: failed.length === students.length ? "error" : "warning",
          message:
            failed.length === students.length
              ? "Failed to remove discounts"
              : `Removed discounts for ${students.length - failed.length} student(s); ${failed.length} failed`,
        });
        if (failed.length === students.length) return;
      }
      await calculateDues();
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
      <Box sx={{ width: 420, p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Apply Discount
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
          Attach a discount to a student. Dues are updated after recalculation.
        </Typography>

        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Class</InputLabel>
            <Select
              value={classId}
              label="Class"
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setStudents([]);
              }}
            >
              <MenuItem value="">Select...</MenuItem>
              {classes.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!classId || sectionsLoading}>
            <InputLabel>Section</InputLabel>
            <Select
              value={sectionId}
              label="Section"
              onChange={(e) => {
                setSectionId(e.target.value);
                setStudents([]);
              }}
            >
              <MenuItem value="">
                {sectionsLoading ? "Loading..." : "Select..."}
              </MenuItem>
              {sections.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <StudentPicker
            label="Students"
            value={students}
            onChange={(next) => setStudents(Array.isArray(next) ? next : [])}
            classId={classId}
            sectionId={sectionId}
            multiple
            loadWithoutSearch={Boolean(sectionId)}
            limit={500}
            disabled={!sectionId}
          />

          <FormControl fullWidth>
            <InputLabel>Discount</InputLabel>
            <Select
              value={discountId}
              label="Discount"
              onChange={(e) => setDiscountId(e.target.value)}
            >
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
              {selected.discount_type === "percent"
                ? `${selected.value}%`
                : `${selected.value}`}{" "}
              •{" "}
              {selected.description || "No description"}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => void doRemoveAll()}
            disabled={saving}
          >
            Remove All
          </Button>
          <Button
            variant="contained"
            onClick={() => void doApply()}
            disabled={saving}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}

