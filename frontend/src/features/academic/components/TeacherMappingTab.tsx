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
  Chip,
} from "@mui/material";
import {
  createTeacherAssignment,
  getAcademicYears,
  getClasses,
  getSections,
  getSubjects,
  getTeacherAssignments,
  updateTeacherAssignment,
  deleteTeacherAssignment,
  type AcademicYear,
  type SchoolClass,
  type Section,
  type Subject,
  type TeacherAssignment,
} from "../../../api/academic";
import { getStaff, type Staff } from "../../../api/people";

export default function TeacherMappingTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionsCache, setSectionsCache] = useState<Record<string, Section[]>>(
    {},
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaffState] = useState<Staff[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [open, setOpen] = useState(false);
  const [createClassId, setCreateClassId] = useState("");
  const [createSections, setCreateSections] = useState<Section[]>([]);
  const [form, setForm] = useState({
    staff_id: "",
    section_id: "",
    subject_id: "",
  });

  const [editAssignment, setEditAssignment] =
    useState<TeacherAssignment | null>(null);
  const [editClassId, setEditClassId] = useState("");
  const [editSections, setEditSections] = useState<Section[]>([]);
  const [editForm, setEditForm] = useState({
    staff_id: "",
    section_id: "",
    subject_id: "",
  });
  const [deleteAssignment, setDeleteAssignment] =
    useState<TeacherAssignment | null>(null);

  useEffect(() => {
    async function init() {
      const [y, c, s, st] = await Promise.all([
        getAcademicYears(),
        getClasses(),
        getSubjects(),
        getStaff(),
      ]);
      setYears(y);
      setClasses(c);
      setSubjects(s);
      setStaffState(st.items);
      const current = y.find((it) => it.is_current);
      setYearId(current?.id || (y[0]?.id ?? ""));
    }
    init().catch(console.error);
  }, []);

  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId("");
      return;
    }
    getSections(classId)
      .then((data) => {
        setSections(data);
        setSectionsCache((prev) => ({ ...prev, [classId]: data }));
      })
      .catch(console.error);
  }, [classId]);

  useEffect(() => {
    if (!createClassId) {
      setCreateSections([]);
      return;
    }
    const cached = sectionsCache[createClassId];
    if (cached) {
      setCreateSections(cached);
      return;
    }
    getSections(createClassId)
      .then((data) => {
        setCreateSections(data);
        setSectionsCache((prev) => ({ ...prev, [createClassId]: data }));
      })
      .catch(console.error);
  }, [createClassId, sectionsCache]);

  useEffect(() => {
    if (!editClassId) {
      setEditSections([]);
      return;
    }
    const cached = sectionsCache[editClassId];
    if (cached) {
      setEditSections(cached);
      return;
    }
    getSections(editClassId)
      .then((data) => {
        setEditSections(data);
        setSectionsCache((prev) => ({ ...prev, [editClassId]: data }));
      })
      .catch(console.error);
  }, [editClassId, sectionsCache]);

  const loadAssignments = async () => {
    if (!yearId) {
      setAssignments([]);
      return;
    }
    const data = await getTeacherAssignments({
      academic_year_id: yearId,
      section_id: sectionId || undefined,
    });
    setAssignments(data);
  };

  useEffect(() => {
    loadAssignments().catch(console.error);
  }, [yearId, sectionId]);

  const handleCreate = async () => {
    try {
      await createTeacherAssignment({
        academic_year_id: yearId,
        staff_id: form.staff_id,
        section_id: form.section_id,
        subject_id: form.subject_id,
      });
      setOpen(false);
      setCreateClassId("");
      setCreateSections([]);
      setForm({ staff_id: "", section_id: "", subject_id: "" });
      loadAssignments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCreate = () => {
    const initialClassId = classId || "";
    setCreateClassId(initialClassId);
    setCreateSections(
      initialClassId ? sectionsCache[initialClassId] || sections : [],
    );
    setForm({ staff_id: "", section_id: "", subject_id: "" });
    setOpen(true);
  };

  const handleOpenEdit = (assignment: TeacherAssignment) => {
    const knownClassId =
      (classId &&
        sections.some((s) => s.id === assignment.section_id) &&
        classId) ||
      Object.entries(sectionsCache).find(([, secs]) =>
        secs.some((s) => s.id === assignment.section_id),
      )?.[0] ||
      "";

    setEditAssignment(assignment);
    setEditClassId(knownClassId);
    setEditSections(
      knownClassId ? sectionsCache[knownClassId] || sections : [],
    );
    setEditForm({
      staff_id: assignment.staff_id,
      section_id: assignment.section_id,
      subject_id: assignment.subject_id,
    });
  };

  const handleUpdate = async () => {
    if (!editAssignment) return;
    try {
      await updateTeacherAssignment(editAssignment.id, {
        staff_id: editForm.staff_id,
        section_id: editForm.section_id,
        subject_id: editForm.subject_id,
      });
      setEditAssignment(null);
      setEditForm({
        staff_id: "",
        section_id: "",
        subject_id: "",
      });
      loadAssignments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteAssignment) return;
    try {
      await deleteTeacherAssignment(deleteAssignment.id);
      setDeleteAssignment(null);
      loadAssignments();
    } catch (e) {
      console.error(e);
    }
  };

  const sectionName = (id: string) =>
    sections.find((s) => s.id === id)?.name ||
    Object.values(sectionsCache)
      .flat()
      .find((s) => s.id === id)?.name ||
    id;
  const subjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name || id;
  const staffName = (id: string) => {
    const t = staff.find((s) => s.id === id);
    return t ? t.full_name : id;
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
          <FormControl sx={{ minWidth: 260 }} size="small">
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

          <FormControl sx={{ minWidth: 220 }} size="small">
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

          <FormControl sx={{ minWidth: 220 }} size="small" disabled={!classId}>
            <InputLabel>Section</InputLabel>
            <Select
              value={sectionId}
              label="Section"
              onChange={(e) => setSectionId(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {sections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Button
          variant="contained"
          onClick={handleOpenCreate}
          disabled={!yearId}
        >
          Add Mapping
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Section</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{sectionName(a.section_id)}</TableCell>
                <TableCell>{subjectName(a.subject_id)}</TableCell>
                <TableCell>{staffName(a.staff_id)}</TableCell>
                <TableCell>
                  <Chip
                    label={a.is_active ? "Active" : "Inactive"}
                    color={a.is_active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    sx={{ mr: 1 }}
                    onClick={() => handleOpenEdit(a)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setDeleteAssignment(a)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No mappings found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setCreateClassId("");
          setCreateSections([]);
          setForm({ staff_id: "", section_id: "", subject_id: "" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Class–Subject–Teacher Mapping</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Class</InputLabel>
            <Select
              value={createClassId}
              label="Class"
              onChange={(e) => {
                const next = e.target.value;
                setCreateClassId(next);
                setForm((prev) => ({ ...prev, section_id: "" }));
              }}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Section</InputLabel>
            <Select
              value={form.section_id}
              label="Section"
              onChange={(e) => setForm({ ...form, section_id: e.target.value })}
              disabled={!createClassId}
            >
              {createSections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select
              value={form.subject_id}
              label="Subject"
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Teacher</InputLabel>
            <Select
              value={form.staff_id}
              label="Teacher"
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
            >
              {staff.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setCreateClassId("");
              setCreateSections([]);
              setForm({ staff_id: "", section_id: "", subject_id: "" });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={
              !createClassId ||
              !form.staff_id ||
              !form.section_id ||
              !form.subject_id
            }
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editAssignment}
        onClose={() => {
          setEditAssignment(null);
          setEditClassId("");
          setEditSections([]);
          setEditForm({
            staff_id: "",
            section_id: "",
            subject_id: "",
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Class–Subject–Teacher Mapping</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Class</InputLabel>
            <Select
              value={editClassId}
              label="Class"
              onChange={(e) => {
                const next = e.target.value;
                setEditClassId(next);
                setEditForm((prev) => ({ ...prev, section_id: "" }));
              }}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Section</InputLabel>
            <Select
              value={editForm.section_id}
              label="Section"
              onChange={(e) =>
                setEditForm({ ...editForm, section_id: e.target.value })
              }
              disabled={!editClassId}
            >
              {editSections.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select
              value={editForm.subject_id}
              label="Subject"
              onChange={(e) =>
                setEditForm({ ...editForm, subject_id: e.target.value })
              }
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Teacher</InputLabel>
            <Select
              value={editForm.staff_id}
              label="Teacher"
              onChange={(e) =>
                setEditForm({ ...editForm, staff_id: e.target.value })
              }
            >
              {staff.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditAssignment(null);
              setEditClassId("");
              setEditSections([]);
              setEditForm({
                staff_id: "",
                section_id: "",
                subject_id: "",
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteAssignment}
        onClose={() => setDeleteAssignment(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Mapping</DialogTitle>
        <DialogContent>
          <Box>Are you sure you want to delete this mapping?</Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAssignment(null)}>Cancel</Button>
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
