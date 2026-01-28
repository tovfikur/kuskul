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
  Typography,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { showToast } from "../../../app/toast";
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getStreams,
  type SchoolClass,
  type Section,
  type Stream,
} from "../../../api/academic";

export default function ClassesTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [openClassDialog, setOpenClassDialog] = useState(false);
  const [editClass, setEditClass] = useState<SchoolClass | null>(null);
  const [deleteClassTarget, setDeleteClassTarget] =
    useState<SchoolClass | null>(null);
  const [classForm, setClassForm] = useState({
    name: "",
    numeric_value: 0,
    is_active: true,
  });
  const [editClassForm, setEditClassForm] = useState({
    name: "",
    numeric_value: 0,
    is_active: true,
  });

  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionForm, setSectionForm] = useState({
    name: "",
    capacity: 40,
    stream_id: "",
    is_active: true,
  });
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] =
    useState<Section | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({
    name: "",
    capacity: 40,
    stream_id: "",
    is_active: true,
  });

  const loadClasses = async () => {
    try {
      const data = await getClasses();
      setClasses(data);
      const st = await getStreams();
      setStreams(st);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreateClass = async () => {
    try {
      await createClass(classForm);
      setOpenClassDialog(false);
      loadClasses();
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : detail?.detail || "Failed to create class";
      showToast({ message: msg, severity: "error" });
    }
  };

  const handleOpenEditClass = (cls: SchoolClass) => {
    setEditClass(cls);
    setEditClassForm({
      name: cls.name,
      numeric_value: cls.numeric_value ?? 0,
      is_active: cls.is_active,
    });
  };

  const handleUpdateClass = async () => {
    if (!editClass) return;
    try {
      await updateClass(editClass.id, {
        name: editClassForm.name,
        numeric_value: editClassForm.numeric_value,
        is_active: editClassForm.is_active,
      });
      setEditClass(null);
      setEditClassForm({
        name: "",
        numeric_value: 0,
        is_active: true,
      });
      loadClasses();
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : detail?.detail || "Failed to update class";
      showToast({ message: msg, severity: "error" });
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!deleteClassTarget) return;
    try {
      await deleteClass(deleteClassTarget.id);
      setDeleteClassTarget(null);
      if (selectedClass && selectedClass.id === deleteClassTarget.id) {
        setSelectedClass(null);
        setSections([]);
      }
      loadClasses();
      showToast({ message: "Class deleted successfully", severity: "success" });
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : detail?.detail || "Failed to delete class";
      showToast({ message: msg, severity: "error" });
    }
  };

  const openSections = async (cls: SchoolClass) => {
    setSelectedClass(cls);
    try {
      const data = await getSections(cls.id);
      setSections(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSection = async () => {
    if (!selectedClass) return;
    try {
      await createSection({
        class_id: selectedClass.id,
        name: sectionForm.name,
        capacity: sectionForm.capacity,
        stream_id: sectionForm.stream_id ? sectionForm.stream_id : null,
        is_active: sectionForm.is_active,
      });
      setSectionForm({
        name: "",
        capacity: 40,
        stream_id: "",
        is_active: true,
      });
      // reload sections
      const data = await getSections(selectedClass.id);
      setSections(data);
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : detail?.detail || "Failed to create section";
      showToast({ message: msg, severity: "error" });
    }
  };

  const handleOpenEditSection = (sec: Section) => {
    setEditSection(sec);
    setEditSectionForm({
      name: sec.name,
      capacity: sec.capacity,
      stream_id: sec.stream_id ?? "",
      is_active: sec.is_active,
    });
  };

  const handleUpdateSection = async () => {
    if (!editSection) return;
    try {
      await updateSection(editSection.id, {
        name: editSectionForm.name,
        capacity: editSectionForm.capacity,
        stream_id: editSectionForm.stream_id ? editSectionForm.stream_id : null,
        is_active: editSectionForm.is_active,
      });
      setEditSection(null);
      setEditSectionForm({
        name: "",
        capacity: 40,
        stream_id: "",
        is_active: true,
      });
      if (selectedClass) {
        const data = await getSections(selectedClass.id);
        setSections(data);
      }
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail?.detail || "Failed to update section";
      showToast({ message: msg, severity: "error" });
    }
  };

  const handleConfirmDeleteSection = async () => {
    if (!deleteSectionTarget || !selectedClass) return;
    try {
      await deleteSection(deleteSectionTarget.id);
      setDeleteSectionTarget(null);
      // reload sections
      const data = await getSections(selectedClass.id);
      setSections(data);
      showToast({ message: "Section deleted successfully", severity: "success" });
    } catch (e: any) {
      console.error(e);
      const detail = e.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : detail?.detail || "Failed to delete section";
      showToast({ message: msg, severity: "error" });
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpenClassDialog(true)}>
          Add Class
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Class Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sections</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.numeric_value ?? "-"}</TableCell>
                <TableCell>{row.is_active ? "Active" : "Inactive"}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openSections(row)}>
                    Manage Sections
                  </Button>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit Class">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditClass(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Class">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteClassTarget(row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No classes found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Class Dialog */}
      <Dialog open={openClassDialog} onClose={() => setOpenClassDialog(false)}>
        <DialogTitle>Add Class</DialogTitle>
        <DialogContent>
          <TextField
            label="Name (e.g. Class 1)"
            fullWidth
            margin="normal"
            onChange={(e) =>
              setClassForm({ ...classForm, name: e.target.value })
            }
          />
          <TextField
            label="Class Level (number)"
            type="number"
            fullWidth
            margin="normal"
            onChange={(e) =>
              setClassForm({
                ...classForm,
                numeric_value: parseInt(e.target.value),
              })
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={classForm.is_active}
                onChange={(e) =>
                  setClassForm({ ...classForm, is_active: e.target.checked })
                }
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenClassDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateClass} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editClass}
        onClose={() => {
          setEditClass(null);
          setEditClassForm({
            name: "",
            numeric_value: 0,
            is_active: true,
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Class</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editClassForm.name}
            onChange={(e) =>
              setEditClassForm({ ...editClassForm, name: e.target.value })
            }
          />
          <TextField
            label="Class Level (number)"
            type="number"
            fullWidth
            margin="normal"
            value={editClassForm.numeric_value}
            onChange={(e) =>
              setEditClassForm({
                ...editClassForm,
                numeric_value: parseInt(e.target.value || "0"),
              })
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={editClassForm.is_active}
                onChange={(e) =>
                  setEditClassForm({
                    ...editClassForm,
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
              setEditClass(null);
              setEditClassForm({
                name: "",
                numeric_value: 0,
                is_active: true,
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateClass} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteClassTarget}
        onClose={() => setDeleteClassTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Class</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteClassTarget?.name}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteClassTarget(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDeleteClass}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sections Dialog */}
      <Dialog
        open={!!selectedClass}
        onClose={() => setSelectedClass(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Sections for {selectedClass?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
            <TextField
              label="New Section Name (e.g. A)"
              size="small"
              value={sectionForm.name}
              onChange={(e) =>
                setSectionForm({ ...sectionForm, name: e.target.value })
              }
            />
            <TextField
              label="Capacity"
              size="small"
              type="number"
              value={sectionForm.capacity}
              onChange={(e) =>
                setSectionForm({
                  ...sectionForm,
                  capacity: parseInt(e.target.value),
                })
              }
              sx={{ width: 120 }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Stream</InputLabel>
              <Select
                value={sectionForm.stream_id}
                label="Stream"
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, stream_id: e.target.value })
                }
              >
                <MenuItem value="">None</MenuItem>
                {streams.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={sectionForm.is_active}
                  onChange={(e) =>
                    setSectionForm({
                      ...sectionForm,
                      is_active: e.target.checked,
                    })
                  }
                />
              }
              label="Active"
              sx={{ ml: 1 }}
            />
            <Button variant="contained" onClick={handleCreateSection}>
              Add
            </Button>
          </Box>
          <List>
            {sections.map((sec) => (
              <ListItem
                key={sec.id}
                divider
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Edit Section">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleOpenEditSection(sec)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Section">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => setDeleteSectionTarget(sec)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={`${sec.name} (Capacity: ${sec.capacity})`}
                  secondary={
                    sec.stream_id
                      ? `Stream: ${
                          streams.find((s) => s.id === sec.stream_id)?.name ??
                          sec.stream_id
                        }`
                      : "No stream"
                  }
                />
              </ListItem>
            ))}
            {sections.length === 0 && (
              <Typography color="text.secondary">No sections yet.</Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedClass(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editSection}
        onClose={() => {
          setEditSection(null);
          setEditSectionForm({
            name: "",
            capacity: 40,
            stream_id: "",
            is_active: true,
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Section</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
            <TextField
              label="Section Name"
              size="small"
              fullWidth
              value={editSectionForm.name}
              onChange={(e) =>
                setEditSectionForm({
                  ...editSectionForm,
                  name: e.target.value,
                })
              }
            />
            <TextField
              label="Capacity"
              size="small"
              type="number"
              value={editSectionForm.capacity}
              onChange={(e) =>
                setEditSectionForm({
                  ...editSectionForm,
                  capacity: parseInt(e.target.value || "0"),
                })
              }
              sx={{ width: 120 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Stream</InputLabel>
              <Select
                value={editSectionForm.stream_id}
                label="Stream"
                onChange={(e) =>
                  setEditSectionForm({
                    ...editSectionForm,
                    stream_id: e.target.value,
                  })
                }
              >
                <MenuItem value="">None</MenuItem>
                {streams.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    {st.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={editSectionForm.is_active}
                  onChange={(e) =>
                    setEditSectionForm({
                      ...editSectionForm,
                      is_active: e.target.checked,
                    })
                  }
                />
              }
              label="Active"
              sx={{ ml: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditSection(null);
              setEditSectionForm({
                name: "",
                capacity: 40,
                stream_id: "",
                is_active: true,
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateSection} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteSectionTarget}
        onClose={() => setDeleteSectionTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Section</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{deleteSectionTarget?.name}</strong>? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSectionTarget(null)}>Cancel</Button>
          <Button
            onClick={handleConfirmDeleteSection}
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
