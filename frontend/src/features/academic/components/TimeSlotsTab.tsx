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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  type TimeSlot,
} from "../../../api/academic";

export default function TimeSlotsTab() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    slot_type: "class",
    shift: "morning",
    is_active: true,
  });
  const [editSlot, setEditSlot] = useState<TimeSlot | null>(null);
  const [deleteSlot, setDeleteSlot] = useState<TimeSlot | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    slot_type: "class",
    shift: "morning",
    is_active: true,
  });

  const load = async () => {
    try {
      const data = await getTimeSlots();
      setSlots(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createTimeSlot({
        name: form.name,
        start_time: form.start_time,
        end_time: form.end_time,
        slot_type: form.slot_type,
        shift: form.shift,
        is_active: form.is_active,
      });
      setOpen(false);
      setForm({
        name: "",
        start_time: "",
        end_time: "",
        slot_type: "class",
        shift: "morning",
        is_active: true,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (slot: TimeSlot) => {
    setEditSlot(slot);
    setEditForm({
      name: slot.name,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      slot_type: slot.slot_type,
      shift: slot.shift,
      is_active: slot.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editSlot) return;
    try {
      await updateTimeSlot(editSlot.id, {
        name: editForm.name,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        slot_type: editForm.slot_type,
        shift: editForm.shift,
        is_active: editForm.is_active,
      });
      setEditSlot(null);
      setEditForm({
        name: "",
        start_time: "",
        end_time: "",
        slot_type: "class",
        shift: "morning",
        is_active: true,
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteSlot) return;
    try {
      await deleteTimeSlot(deleteSlot.id);
      setDeleteSlot(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Time Slot
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.start_time}</TableCell>
                <TableCell>{row.end_time}</TableCell>
                <TableCell>{row.slot_type}</TableCell>
                <TableCell>{row.shift}</TableCell>
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
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => handleOpenEdit(row)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={() => setDeleteSlot(row)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {slots.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>No time slots found.</TableCell>
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
        <DialogTitle>Add Time Slot</DialogTitle>
        <DialogContent>
          <TextField
            label="Name (e.g. Period 1 / Break)"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="time"
              label="Start Time"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <TextField
              type="time"
              label="End Time"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={form.slot_type}
              label="Type"
              onChange={(e) => setForm({ ...form, slot_type: e.target.value })}
            >
              <MenuItem value="class">Class</MenuItem>
              <MenuItem value="lab">Lab</MenuItem>
              <MenuItem value="break">Break</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Shift</InputLabel>
            <Select
              value={form.shift}
              label="Shift"
              onChange={(e) => setForm({ ...form, shift: e.target.value })}
            >
              <MenuItem value="morning">Morning</MenuItem>
              <MenuItem value="evening">Evening</MenuItem>
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editSlot}
        onClose={() => {
          setEditSlot(null);
          setEditForm({
            name: "",
            start_time: "",
            end_time: "",
            slot_type: "class",
            shift: "morning",
            is_active: true,
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Time Slot</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="time"
              label="Start Time"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={editForm.start_time}
              onChange={(e) =>
                setEditForm({ ...editForm, start_time: e.target.value })
              }
            />
            <TextField
              type="time"
              label="End Time"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={editForm.end_time}
              onChange={(e) =>
                setEditForm({ ...editForm, end_time: e.target.value })
              }
            />
          </Box>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={editForm.slot_type}
              label="Type"
              onChange={(e) =>
                setEditForm({ ...editForm, slot_type: e.target.value })
              }
            >
              <MenuItem value="class">Class</MenuItem>
              <MenuItem value="lab">Lab</MenuItem>
              <MenuItem value="break">Break</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Shift</InputLabel>
            <Select
              value={editForm.shift}
              label="Shift"
              onChange={(e) =>
                setEditForm({ ...editForm, shift: e.target.value })
              }
            >
              <MenuItem value="morning">Morning</MenuItem>
              <MenuItem value="evening">Evening</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm({ ...editForm, is_active: e.target.checked })
                }
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditSlot(null);
              setEditForm({
                name: "",
                start_time: "",
                end_time: "",
                slot_type: "class",
                shift: "morning",
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
        open={!!deleteSlot}
        onClose={() => setDeleteSlot(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Time Slot</DialogTitle>
        <DialogContent>
          <Box>
            Are you sure you want to delete{" "}
            <strong>{deleteSlot?.name}</strong>?
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSlot(null)}>Cancel</Button>
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
