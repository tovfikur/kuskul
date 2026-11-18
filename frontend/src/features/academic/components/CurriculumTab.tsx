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
import type { AxiosError } from "axios";
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
import { showToast } from "../../../app/toast";

const CHAPTER_NAME_OPTIONS = Array.from({ length: 15 }, (_, index) => {
  const chapterNumber = index + 1;
  return `Chapter ${chapterNumber}`;
});

type ApiErrorData = {
  detail?: string | Array<{ msg?: string }>;
  title?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  const maybeAxios = error as AxiosError<ApiErrorData>;
  const detail = maybeAxios.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }
  return maybeAxios.response?.data?.title || fallback;
}

function getSubjectLabel(subject: Subject) {
  const code = subject.code?.trim();
  return code ? `(${code}) ${subject.name}` : subject.name;
}

export default function CurriculumTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [yearId, setYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<CurriculumUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    chapter_name: "",
    description: "",
    order_index: "0",
  });
  const [editUnit, setEditUnit] = useState<CurriculumUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<CurriculumUnit | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    chapter_name: "",
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
    if (!yearId || !subjectId) {
      showToast({
        severity: "error",
        message: "Select an academic year and subject first.",
      });
      return;
    }
    const orderIndex = Number.parseInt(form.order_index || "0", 10);
    if (Number.isNaN(orderIndex)) {
      showToast({ severity: "error", message: "Order must be a valid number." });
      return;
    }
    try {
      await createCurriculumUnit({
        academic_year_id: yearId,
        subject_id: subjectId,
        title: form.title,
        chapter_name: form.chapter_name,
        description: form.description || null,
        order_index: orderIndex,
      });
      setOpen(false);
      setForm({
        title: "",
        chapter_name: "",
        description: "",
        order_index: "0",
      });
      showToast({
        severity: "success",
        message: "Curriculum chapter created successfully.",
      });
      load();
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: getErrorMessage(e, "Failed to create curriculum chapter."),
      });
    }
  };

  const handleOpenEdit = (unit: CurriculumUnit) => {
    setEditUnit(unit);
    setEditForm({
      title: unit.title,
      chapter_name: unit.chapter_name || "",
      description: unit.description || "",
      order_index: String(unit.order_index),
    });
  };

  const handleUpdate = async () => {
    if (!editUnit) return;
    const orderIndex = Number.parseInt(editForm.order_index || "0", 10);
    if (Number.isNaN(orderIndex)) {
      showToast({ severity: "error", message: "Order must be a valid number." });
      return;
    }
    try {
      await updateCurriculumUnit(editUnit.id, {
        title: editForm.title,
        chapter_name: editForm.chapter_name,
        description: editForm.description || null,
        order_index: orderIndex,
      });
      setEditUnit(null);
      setEditForm({
        title: "",
        chapter_name: "",
        description: "",
        order_index: "0",
      });
      showToast({
        severity: "success",
        message: "Curriculum chapter updated successfully.",
      });
      load();
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: getErrorMessage(e, "Failed to update curriculum chapter."),
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUnit) return;
    try {
      await deleteCurriculumUnit(deleteUnit.id);
      setDeleteUnit(null);
      showToast({
        severity: "success",
        message: "Curriculum chapter deleted successfully.",
      });
      load();
    } catch (e) {
      console.error(e);
      showToast({
        severity: "error",
        message: getErrorMessage(e, "Failed to delete curriculum chapter."),
      });
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
                  {getSubjectLabel(s)}
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
          Add Curriculum Chapter
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Chapter Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.order_index}</TableCell>
                <TableCell>{u.title}</TableCell>
                <TableCell>{u.chapter_name || "-"}</TableCell>
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
                <TableCell colSpan={5}>No curriculum units found.</TableCell>
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
        <DialogTitle>Add Curriculum Chapter</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Chapter Name</InputLabel>
            <Select
              value={form.chapter_name}
              label="Chapter Name"
              onChange={(e) =>
                setForm({ ...form, chapter_name: e.target.value })
              }
            >
              {CHAPTER_NAME_OPTIONS.map((chapterName) => (
                <MenuItem key={chapterName} value={chapterName}>
                  {chapterName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
            disabled={!form.title || !form.chapter_name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editUnit}
        onClose={() => {
          setEditUnit(null);
          setEditForm({
            title: "",
            chapter_name: "",
            description: "",
            order_index: "0",
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Curriculum Chapter</DialogTitle>
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Chapter Name</InputLabel>
            <Select
              value={editForm.chapter_name}
              label="Chapter Name"
              onChange={(e) =>
                setEditForm({ ...editForm, chapter_name: e.target.value })
              }
            >
              {CHAPTER_NAME_OPTIONS.map((chapterName) => (
                <MenuItem key={chapterName} value={chapterName}>
                  {chapterName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
              setEditForm({
                title: "",
                chapter_name: "",
                description: "",
                order_index: "0",
              });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!editForm.title || !editForm.chapter_name}
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
