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
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createCurriculumUnit,
  getAcademicYears,
  getCurriculum,
  getSubjects,
  updateCurriculumUnit,
  deleteCurriculumUnit,
  type AcademicYear,
  type CurriculumUnit,
  type Subject,
} from "../../../api/academic";

export default function CurriculumTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [yearId, setYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<CurriculumUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    order_index: "0",
  });
  const [editUnit, setEditUnit] = useState<CurriculumUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<CurriculumUnit | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    order_index: "0",
  });

  useEffect(() => {
    async function init() {
      const [y, s] = await Promise.all([getAcademicYears(), getSubjects()]);
      setYears(y);
      setSubjects(s);
      const current = y.find((it) => it.is_current);
      setYearId(current?.id || (y[0]?.id ?? ""));
    }
    init().catch(console.error);
  }, []);

  const load = async () => {
    if (!yearId || !subjectId) {
      setUnits([]);
      return;
    }
    const data = await getCurriculum({
      academic_year_id: yearId,
      subject_id: subjectId,
    });
    setUnits(data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [yearId, subjectId]);

  const handleCreate = async () => {
    try {
      await createCurriculumUnit({
        academic_year_id: yearId,
        subject_id: subjectId,
        title: form.title,
        description: form.description || null,
        order_index: parseInt(form.order_index || "0"),
      });
      setOpen(false);
      setForm({ title: "", description: "", order_index: "0" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (unit: CurriculumUnit) => {
    setEditUnit(unit);
    setEditForm({
      title: unit.title,
      description: unit.description || "",
      order_index: String(unit.order_index),
    });
  };

  const handleUpdate = async () => {
    if (!editUnit) return;
    try {
      await updateCurriculumUnit(editUnit.id, {
        title: editForm.title,
        description: editForm.description || null,
        order_index: parseInt(editForm.order_index || "0"),
      });
      setEditUnit(null);
      setEditForm({ title: "", description: "", order_index: "0" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUnit) return;
    try {
      await deleteCurriculumUnit(deleteUnit.id);
      setDeleteUnit(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 240 }} size="small">
            <InputLabel>Academic Year</InputLabel>
            <Select
              value={yearId}
              label="Academic Year"
              onChange={(e) => setYearId(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? " (Current)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 280 }} size="small">
            <InputLabel>Subject</InputLabel>
            <Select
              value={subjectId}
              label="Subject"
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          disabled={!yearId || !subjectId}
        >
          Add Curriculum Unit
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.order_index}</TableCell>
                <TableCell>{u.title}</TableCell>
                <TableCell>{u.description || "-"}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => handleOpenEdit(u)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={() => setDeleteUnit(u)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No curriculum units found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Curriculum Unit</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Order"
            type="number"
            fullWidth
            margin="normal"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!form.title}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editUnit}
        onClose={() => {
          setEditUnit(null);
          setEditForm({ title: "", description: "", order_index: "0" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Curriculum Unit</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
          />
          <TextField
            label="Order"
            type="number"
            fullWidth
            margin="normal"
            value={editForm.order_index}
            onChange={(e) =>
              setEditForm({ ...editForm, order_index: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditUnit(null);
              setEditForm({ title: "", description: "", order_index: "0" });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!editForm.title}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteUnit}
        onClose={() => setDeleteUnit(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Curriculum Unit</DialogTitle>
        <DialogContent>
          <Box>
            Are you sure you want to delete{" "}
            <strong>{deleteUnit?.title}</strong>?
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUnit(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
