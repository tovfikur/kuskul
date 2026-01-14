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
} from "@mui/material";
import {
  getClasses,
  createClass,
  getSections,
  createSection,
  getStreams,
  type SchoolClass,
  type Section,
  type Stream,
} from "../../../api/academic";

export default function ClassesTab() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [openClassDialog, setOpenClassDialog] = useState(false);
  const [classForm, setClassForm] = useState({
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
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
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
              <TableCell>Actions</TableCell>
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
              </TableRow>
            ))}
            {classes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No classes found.</TableCell>
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
              <ListItem key={sec.id} divider>
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
    </Box>
  );
}
