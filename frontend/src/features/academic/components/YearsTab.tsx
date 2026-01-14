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
} from "@mui/material";
import {
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  type AcademicYear,
} from "../../../api/academic";

export default function YearsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  const load = async () => {
    try {
      const data = await getAcademicYears();
      setYears(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createAcademicYear(formData);
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetCurrent = async (id: string) => {
    try {
      await setCurrentAcademicYear(id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Academic Year
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {years.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  {new Date(row.start_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(row.end_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {row.is_current ? (
                    <Chip label="Current" color="success" size="small" />
                  ) : (
                    <Chip label="Inactive" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {!row.is_current && (
                    <Button
                      size="small"
                      onClick={() => handleSetCurrent(row.id)}
                    >
                      Set Current
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {years.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No academic years found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Academic Year</DialogTitle>
        <DialogContent>
          <TextField
            label="Name (e.g. 2025-2026)"
            fullWidth
            margin="normal"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            type="date"
            label="Start Date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            onChange={(e) =>
              setFormData({ ...formData, start_date: e.target.value })
            }
          />
          <TextField
            type="date"
            label="End Date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
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
