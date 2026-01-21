import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import {
  createFeeStructure,
  deleteFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  type FeeStructure,
} from "../../../api/finance";
import {
  getAcademicYears,
  getClasses,
  getCurrentAcademicYear,
  type AcademicYear,
  type SchoolClass,
} from "../../../api/academic";
import { showToast } from "../../../app/toast";
import { formatMoney } from "../financeUtils";
import { FeeStructureDialog, type FeeForm } from "./FeeStructureDialog";

const emptyForm: FeeForm = {
  academic_year_id: "",
  class_id: "",
  name: "",
  amount: "",
  due_date: "",
};

export function FeesTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [yearId, setYearId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FeeStructure[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  );
  const yearNameById = useMemo(
    () => new Map(years.map((y) => [y.id, y.name])),
    [years],
  );

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
      const list = await getFeeStructures({
        academic_year_id: yearId || undefined,
        class_id: classId || undefined,
      });
      setRows(list);
    } catch {
      showToast({
        severity: "error",
        message: "Failed to load fee structures",
      });
    } finally {
      setLoading(false);
    }
  }, [classId, yearId]);

  useEffect(() => {
    if (!yearId) return;
    void load();
  }, [load, yearId]);

  const openCreate = () => {
    setDialogMode("create");
    setEditingId(null);
    setForm({
      ...emptyForm,
      academic_year_id: yearId,
      class_id: classId,
    });
    setDialogOpen(true);
  };

  const openEdit = (r: FeeStructure) => {
    setDialogMode("edit");
    setEditingId(r.id);
    setForm({
      academic_year_id: r.academic_year_id,
      class_id: r.class_id,
      name: r.name,
      amount: String(r.amount),
      due_date: r.due_date ?? "",
    });
    setDialogOpen(true);
  };

  const save = async (payload: {
    academic_year_id: string;
    class_id: string;
    name: string;
    amount: number;
    due_date: string | null;
  }) => {
    setSaving(true);
    try {
      if (dialogMode === "create") {
        await createFeeStructure({
          academic_year_id: payload.academic_year_id,
          class_id: payload.class_id,
          name: payload.name,
          amount: payload.amount,
          due_date: payload.due_date,
        });
      } else {
        if (!editingId) return;
        await updateFeeStructure(editingId, {
          name: payload.name,
          amount: payload.amount,
          due_date: payload.due_date,
        });
      }
      setDialogOpen(false);
      await load();
    } catch {
      showToast({ severity: "error", message: "Failed to save fee structure" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this fee structure?")) return;
    try {
      await deleteFeeStructure(id);
      await load();
    } catch {
      showToast({
        severity: "error",
        message: "Failed to delete fee structure",
      });
    }
  };

  return (
    <Box>
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
              Fee Structures
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Configure class-wise fee items for an academic year.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={yearId}
                label="Academic Year"
                onChange={(e) => setYearId(e.target.value)}
              >
                {years.map((y) => (
                  <MenuItem key={y.id} value={y.id}>
                    {y.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Class</InputLabel>
              <Select
                value={classId}
                label="Class"
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
            <Button
              variant="outlined"
              onClick={() => void load()}
              disabled={!yearId || loading}
            >
              Reload
            </Button>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={!yearId || saving}
            >
              New Fee
            </Button>
          </Box>
        </Box>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Academic Year</TableCell>
                <TableCell>Class</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    {yearNameById.get(r.academic_year_id) ?? "—"}
                  </TableCell>
                  <TableCell>{classNameById.get(r.class_id) ?? "—"}</TableCell>
                  <TableCell align="right">{formatMoney(r.amount)}</TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openEdit(r)}
                      aria-label="edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => void remove(r.id)}
                      aria-label="delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    {yearId
                      ? "No fee structures found."
                      : "Select an academic year."}
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6}>Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <FeeStructureDialog
        open={dialogOpen}
        mode={dialogMode}
        years={years}
        classes={classes}
        initial={form}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={(payload) => void save(payload)}
      />
    </Box>
  );
}
