import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getSubjects,
  createSubject,
  assignSubjectToClass,
  getClasses,
  getStreams,
  getSubjectGroups,
  updateSubject,
  deleteSubject,
  type Subject,
  type SchoolClass,
  type Stream,
  type SubjectGroup,
} from "../../../api/academic";

export default function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [groups, setGroups] = useState<SubjectGroup[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    subject_type: "theory",
    credits: "",
    max_marks: "",
    stream_id: "",
    group_id: "",
    is_active: true,
  });

  const [assignSubject, setAssignSubject] = useState<Subject | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [editSubjectState, setEditSubjectState] = useState<Subject | null>(
    null
  );
  const [deleteSubjectState, setDeleteSubjectState] = useState<Subject | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    subject_type: "theory",
    credits: "",
    max_marks: "",
    stream_id: "",
    group_id: "",
    is_active: true,
  });

  const load = async () => {
    try {
      const [s, c, st, g] = await Promise.all([
        getSubjects(),
        getClasses(),
        getStreams(),
        getSubjectGroups(),
      ]);
      setSubjects(s);
      setClasses(c);
      setStreams(st);
      setGroups(g);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createSubject({
        name: form.name,
        code: form.code || null,
        subject_type: form.subject_type,
        credits: form.credits ? parseInt(form.credits) : null,
        max_marks: form.max_marks ? parseInt(form.max_marks) : null,
        stream_id: form.stream_id ? form.stream_id : null,
        group_id: form.group_id ? form.group_id : null,
        is_active: form.is_active,
      });
      setOpenCreate(false);
      setForm({
        name: "",
        code: "",
        subject_type: "theory",
        credits: "",
        max_marks: "",
        stream_id: "",
        group_id: "",
        is_active: true,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (s: Subject) => {
    setEditSubjectState(s);
    setEditForm({
      name: s.name,
      code: s.code ?? "",
      subject_type: s.subject_type,
      credits: s.credits != null ? String(s.credits) : "",
      max_marks: s.max_marks != null ? String(s.max_marks) : "",
      stream_id: s.stream_id ?? "",
      group_id: s.group_id ?? "",
      is_active: s.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editSubjectState) return;
    try {
      await updateSubject(editSubjectState.id, {
        name: editForm.name,
        code: editForm.code || null,
        subject_type: editForm.subject_type,
        credits: editForm.credits ? parseInt(editForm.credits) : null,
        max_marks: editForm.max_marks ? parseInt(editForm.max_marks) : null,
        stream_id: editForm.stream_id ? editForm.stream_id : null,
        group_id: editForm.group_id ? editForm.group_id : null,
        is_active: editForm.is_active,
      });
      setEditSubjectState(null);
      setEditForm({
        name: "",
        code: "",
        subject_type: "theory",
        credits: "",
        max_marks: "",
        stream_id: "",
        group_id: "",
        is_active: true,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteSubjectState) return;
    try {
      await deleteSubject(deleteSubjectState.id);
      setDeleteSubjectState(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async () => {
    if (!assignSubject || !selectedClassId) return;
    try {
      await assignSubjectToClass(assignSubject.id, selectedClassId);
      setAssignSubject(null);
      setSelectedClassId("");
    } catch (e) {
      console.error(e);
    }
  };

  const streamName = (id: string | null) =>
    streams.find((s) => s.id === id)?.name || "-";
  const groupName = (id: string | null) =>
    groups.find((g) => g.id === id)?.name || "-";

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpenCreate(true)}>
          Add Subject
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Credits</TableCell>
              <TableCell>Max Marks</TableCell>
              <TableCell>Stream</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.code || "-"}</TableCell>
                <TableCell>{row.subject_type}</TableCell>
                <TableCell>{row.credits ?? "-"}</TableCell>
                <TableCell>{row.max_marks ?? "-"}</TableCell>
                <TableCell>{streamName(row.stream_id)}</TableCell>
                <TableCell>{groupName(row.group_id)}</TableCell>
                <TableCell>
                  <Chip
                    label={row.is_active ? "Active" : "Inactive"}
                    color={row.is_active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    sx={{ mr: 1 }}
                    onClick={() => setAssignSubject(row)}
                  >
                    Assign to Class
                  </Button>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteSubjectState(row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {subjects.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>No subjects found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Subject</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject Type</InputLabel>
            <Select
              value={form.subject_type}
              label="Subject Type"
              onChange={(e) =>
                setForm({ ...form, subject_type: e.target.value })
              }
            >
              <MenuItem value="theory">Theory</MenuItem>
              <MenuItem value="practical">Practical</MenuItem>
              <MenuItem value="lab">Lab</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Credits"
              type="number"
              margin="normal"
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Marks"
              type="number"
              margin="normal"
              value={form.max_marks}
              onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
              sx={{ flex: 1 }}
            />
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Stream</InputLabel>
            <Select
              value={form.stream_id}
              label="Stream"
              onChange={(e) => setForm({ ...form, stream_id: e.target.value })}
            >
              <MenuItem value="">None</MenuItem>
              {streams.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject Group</InputLabel>
            <Select
              value={form.group_id}
              label="Subject Group"
              onChange={(e) => setForm({ ...form, group_id: e.target.value })}
            >
              <MenuItem value="">None</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editSubjectState}
        onClose={() => {
          setEditSubjectState(null);
          setEditForm({
            name: "",
            code: "",
            subject_type: "theory",
            credits: "",
            max_marks: "",
            stream_id: "",
            group_id: "",
            is_active: true,
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Subject</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                name: e.target.value,
              })
            }
          />
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={editForm.code}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                code: e.target.value,
              })
            }
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject Type</InputLabel>
            <Select
              value={editForm.subject_type}
              label="Subject Type"
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  subject_type: e.target.value,
                })
              }
            >
              <MenuItem value="theory">Theory</MenuItem>
              <MenuItem value="practical">Practical</MenuItem>
              <MenuItem value="lab">Lab</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Credits"
              type="number"
              margin="normal"
              value={editForm.credits}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  credits: e.target.value,
                })
              }
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Marks"
              type="number"
              margin="normal"
              value={editForm.max_marks}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  max_marks: e.target.value,
                })
              }
              sx={{ flex: 1 }}
            />
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Stream</InputLabel>
            <Select
              value={editForm.stream_id}
              label="Stream"
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  stream_id: e.target.value,
                })
              }
            >
              <MenuItem value="">None</MenuItem>
              {streams.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject Group</InputLabel>
            <Select
              value={editForm.group_id}
              label="Subject Group"
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  group_id: e.target.value,
                })
              }
            >
              <MenuItem value="">None</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    is_active: e.target.checked,
                  })
                }
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditSubjectState(null);
              setEditForm({
                name: "",
                code: "",
                subject_type: "theory",
                credits: "",
                max_marks: "",
                stream_id: "",
                group_id: "",
                is_active: true,
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
        open={!!deleteSubjectState}
        onClose={() => setDeleteSubjectState(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Subject</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteSubjectState?.name}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSubjectState(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assignSubject} onClose={() => setAssignSubject(null)}>
        <DialogTitle>Assign {assignSubject?.name} to Class</DialogTitle>
        <DialogContent sx={{ minWidth: 320 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClassId}
              label="Class"
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignSubject(null)}>Cancel</Button>
          <Button onClick={handleAssign} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
