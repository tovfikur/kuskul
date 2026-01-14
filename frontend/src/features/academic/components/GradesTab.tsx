import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createGrade,
  getGrades,
  updateGrade,
  deleteGrade,
  type Grade,
} from "../../../api/academic";

export default function GradesTab() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    min_percentage: "0",
    max_percentage: "100",
  });
  const [editGrade, setEditGrade] = useState<Grade | null>(null);
  const [deleteGradeState, setDeleteGradeState] = useState<Grade | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    min_percentage: "0",
    max_percentage: "100",
  });

  const load = async () => {
    try {
      setGrades(await getGrades());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      await createGrade({
        name: form.name,
        min_percentage: parseFloat(form.min_percentage),
        max_percentage: parseFloat(form.max_percentage),
      });
      setOpen(false);
      setForm({ name: "", min_percentage: "0", max_percentage: "100" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (grade: Grade) => {
    setEditGrade(grade);
    setEditForm({
      name: grade.name,
      min_percentage: String(grade.min_percentage),
      max_percentage: String(grade.max_percentage),
    });
  };

  const handleUpdate = async () => {
    if (!editGrade) return;
    try {
      await updateGrade(editGrade.id, {
        name: editForm.name,
        min_percentage: parseFloat(editForm.min_percentage),
        max_percentage: parseFloat(editForm.max_percentage),
      });
      setEditGrade(null);
      setEditForm({ name: "", min_percentage: "0", max_percentage: "100" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteGradeState) return;
    try {
      await deleteGrade(deleteGradeState.id);
      setDeleteGradeState(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add Grade
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Min %</TableCell>
              <TableCell>Max %</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grades.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.min_percentage}</TableCell>
                <TableCell>{g.max_percentage}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<EditIcon fontSize="small" />}
                    onClick={() => handleOpenEdit(g)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={() => setDeleteGradeState(g)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {grades.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>No grades found.</TableCell>
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
        <DialogTitle>Add Grade</DialogTitle>
        <DialogContent>
          <TextField
            label="Name (e.g. A+)"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="Min Percentage"
            type="number"
            fullWidth
            margin="normal"
            value={form.min_percentage}
            onChange={(e) =>
              setForm({ ...form, min_percentage: e.target.value })
            }
          />
          <TextField
            label="Max Percentage"
            type="number"
            fullWidth
            margin="normal"
            value={form.max_percentage}
            onChange={(e) =>
              setForm({ ...form, max_percentage: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!form.name}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editGrade}
        onClose={() => {
          setEditGrade(null);
          setEditForm({ name: "", min_percentage: "0", max_percentage: "100" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Grade</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <TextField
            label="Min Percentage"
            type="number"
            fullWidth
            margin="normal"
            value={editForm.min_percentage}
            onChange={(e) =>
              setEditForm({ ...editForm, min_percentage: e.target.value })
            }
          />
          <TextField
            label="Max Percentage"
            type="number"
            fullWidth
            margin="normal"
            value={editForm.max_percentage}
            onChange={(e) =>
              setEditForm({ ...editForm, max_percentage: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditGrade(null);
              setEditForm({
                name: "",
                min_percentage: "0",
                max_percentage: "100",
              });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            disabled={!editForm.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteGradeState}
        onClose={() => setDeleteGradeState(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Grade</DialogTitle>
        <DialogContent>
          <Box>
            Are you sure you want to delete{" "}
            <strong>{deleteGradeState?.name}</strong>?
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGradeState(null)}>Cancel</Button>
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
