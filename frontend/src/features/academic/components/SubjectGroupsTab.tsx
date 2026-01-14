import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createSubjectGroup,
  getClasses,
  getStreams,
  getSubjectGroups,
  updateSubjectGroup,
  deleteSubjectGroup,
  type SchoolClass,
  type Stream,
  type SubjectGroup,
} from "../../../api/academic";

export default function SubjectGroupsTab() {
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    class_id: "",
    stream_id: "",
    is_optional: false,
  });

  const [editGroup, setEditGroup] = useState<SubjectGroup | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<SubjectGroup | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    class_id: "",
    stream_id: "",
    is_optional: false,
  });

  const load = async () => {
    try {
      const [g, c, s] = await Promise.all([
        getSubjectGroups(),
        getClasses(),
        getStreams(),
      ]);
      setGroups(g);
      setClasses(c);
      setStreams(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createSubjectGroup({
        name: form.name,
        class_id: form.class_id ? form.class_id : null,
        stream_id: form.stream_id ? form.stream_id : null,
        is_optional: form.is_optional,
      });
      setOpen(false);
      setForm({ name: "", class_id: "", stream_id: "", is_optional: false });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (g: SubjectGroup) => {
    setEditGroup(g);
    setEditForm({
      name: g.name,
      class_id: g.class_id ?? "",
      stream_id: g.stream_id ?? "",
      is_optional: g.is_optional,
    });
  };

  const handleUpdate = async () => {
    if (!editGroup) return;
    try {
      await updateSubjectGroup(editGroup.id, {
        name: editForm.name,
        class_id: editForm.class_id ? editForm.class_id : null,
        stream_id: editForm.stream_id ? editForm.stream_id : null,
        is_optional: editForm.is_optional,
      });
      setEditGroup(null);
      setEditForm({
        name: "",
        class_id: "",
        stream_id: "",
        is_optional: false,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteGroupTarget) return;
    try {
      await deleteSubjectGroup(deleteGroupTarget.id);
      setDeleteGroupTarget(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const className = (id: string | null) =>
    classes.find((c) => c.id === id)?.name || "-";
  const streamName = (id: string | null) =>
    streams.find((s) => s.id === id)?.name || "-";

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Subject Group
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Stream</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{className(g.class_id)}</TableCell>
                <TableCell>{streamName(g.stream_id)}</TableCell>
                <TableCell>
                  <Chip
                    label={g.is_optional ? "Optional" : "Compulsory"}
                    color={g.is_optional ? "warning" : "info"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenEdit(g)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteGroupTarget(g)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {groups.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No subject groups found.</TableCell>
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
        <DialogTitle>Add Subject Group</DialogTitle>
        <DialogContent>
          <TextField
            label="Group Name (e.g. Compulsory)"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Class (optional)</InputLabel>
            <Select
              value={form.class_id}
              label="Class (optional)"
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            >
              <MenuItem value="">None</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Stream (optional)</InputLabel>
            <Select
              value={form.stream_id}
              label="Stream (optional)"
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
          <FormControlLabel
            control={
              <Switch
                checked={form.is_optional}
                onChange={(e) =>
                  setForm({ ...form, is_optional: e.target.checked })
                }
              />
            }
            label="Optional group"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editGroup}
        onClose={() => {
          setEditGroup(null);
          setEditForm({
            name: "",
            class_id: "",
            stream_id: "",
            is_optional: false,
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Subject Group</DialogTitle>
        <DialogContent>
          <TextField
            label="Group Name"
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Class (optional)</InputLabel>
            <Select
              value={editForm.class_id}
              label="Class (optional)"
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  class_id: e.target.value,
                })
              }
            >
              <MenuItem value="">None</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Stream (optional)</InputLabel>
            <Select
              value={editForm.stream_id}
              label="Stream (optional)"
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
          <FormControlLabel
            control={
              <Switch
                checked={editForm.is_optional}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    is_optional: e.target.checked,
                  })
                }
              />
            }
            label="Optional group"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditGroup(null);
              setEditForm({
                name: "",
                class_id: "",
                stream_id: "",
                is_optional: false,
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
        open={!!deleteGroupTarget}
        onClose={() => setDeleteGroupTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Subject Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteGroupTarget?.name}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGroupTarget(null)}>Cancel</Button>
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
