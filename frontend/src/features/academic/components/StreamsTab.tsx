import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import { createStream, getStreams, type Stream } from "../../../api/academic";

export default function StreamsTab() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", is_active: true });

  const load = async () => {
    try {
      setStreams(await getStreams());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createStream({ name: form.name, is_active: form.is_active });
      setOpen(false);
      setForm({ name: "", is_active: true });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Stream
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {streams.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Chip
                    label={row.is_active ? "Active" : "Inactive"}
                    color={row.is_active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {streams.length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>No streams found.</TableCell>
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
        <DialogTitle>Add Stream</DialogTitle>
        <DialogContent>
          <TextField
            label="Stream Name (e.g. Science)"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
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
