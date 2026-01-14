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
import {
  getTimeSlots,
  createTimeSlot,
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
              </TableRow>
            ))}
            {slots.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No time slots found.</TableCell>
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
    </Box>
  );
}
