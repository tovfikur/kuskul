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
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  type AcademicYear,
} from "../../../api/academic";

export default function YearsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [open, setOpen] = useState(false);
  const [editYear, setEditYear] = useState<AcademicYear | null>(null);
  const [deleteYear, setDeleteYear] = useState<AcademicYear | null>(null);
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

  const handleOpenEdit = (year: AcademicYear) => {
    setEditYear(year);
    setFormData({
      name: year.name,
      start_date: year.start_date.slice(0, 10),
      end_date: year.end_date.slice(0, 10),
    });
  };

  const handleUpdate = async () => {
    if (!editYear) return;
    try {
      await updateAcademicYear(editYear.id, {
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
      });
      setEditYear(null);
      setFormData({ name: "", start_date: "", end_date: "" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteYear) return;
    try {
      await deleteAcademicYear(deleteYear.id);
      setDeleteYear(null);
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
              <TableCell align="right">Actions</TableCell>
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
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!row.is_current && (
                    <Tooltip title="Set current">
                      <Button
                        size="small"
                        onClick={() => handleSetCurrent(row.id)}
                        sx={{ mr: 1 }}
                      >
                        Set Current
                      </Button>
                    </Tooltip>
                  )}
                  {!row.is_current && (
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeleteYear(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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

      <Dialog open={!!editYear} onClose={() => setEditYear(null)}>
        <DialogTitle>Edit Academic Year</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            type="date"
            label="Start Date"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            value={formData.start_date}
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
            value={formData.end_date}
            onChange={(e) =>
              setFormData({ ...formData, end_date: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditYear(null);
              setFormData({ name: "", start_date: "", end_date: "" });
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteYear} onClose={() => setDeleteYear(null)}>
        <DialogTitle>Delete Academic Year</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteYear?.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteYear(null)}>Cancel</Button>
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
