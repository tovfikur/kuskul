import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  createTerm,
  getAcademicYears,
  getTerms,
  updateTerm,
  deleteTerm,
  type AcademicYear,
  type Term,
} from "../../../api/academic";

export default function TermsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [open, setOpen] = useState(false);
  const [editTermState, setEditTermState] = useState<Term | null>(null);
  const [deleteTermState, setDeleteTermState] = useState<Term | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    weightage: "0",
    is_active: true,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    weightage: "0",
    is_active: true,
  });

  const loadYears = async () => {
    const y = await getAcademicYears();
    setYears(y);
    const current = y.find((it) => it.is_current);
    setYearId(current?.id || (y[0]?.id ?? ""));
  };

  const loadTerms = async (id: string) => {
    if (!id) {
      setTerms([]);
      return;
    }
    setTerms(await getTerms(id));
  };

  useEffect(() => {
    loadYears().catch(console.error);
  }, []);

  useEffect(() => {
    loadTerms(yearId).catch(console.error);
  }, [yearId]);

  const handleCreate = async () => {
    try {
      await createTerm({
        academic_year_id: yearId,
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        weightage: parseInt(form.weightage || "0"),
        is_active: form.is_active,
      });
      setOpen(false);
      setForm({
        name: "",
        start_date: "",
        end_date: "",
        weightage: "0",
        is_active: true,
      });
      loadTerms(yearId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (term: Term) => {
    setEditTermState(term);
    setEditForm({
      name: term.name,
      start_date: term.start_date.slice(0, 10),
      end_date: term.end_date.slice(0, 10),
      weightage: String(term.weightage ?? 0),
      is_active: term.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editTermState) return;
    try {
      await updateTerm(editTermState.id, {
        name: editForm.name,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
        weightage: parseInt(editForm.weightage || "0"),
        is_active: editForm.is_active,
      });
      setEditTermState(null);
      setEditForm({
        name: "",
        start_date: "",
        end_date: "",
        weightage: "0",
        is_active: true,
      });
      loadTerms(yearId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTermState) return;
    try {
      await deleteTerm(deleteTermState.id);
      setDeleteTermState(null);
      loadTerms(yearId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <FormControl sx={{ minWidth: 260 }} size="small">
          <InputLabel>Academic Year</InputLabel>
          <Select
            value={yearId}
            label="Academic Year"
            onChange={(e) => setYearId(e.target.value)}
          >
            {years.map((y) => (
              <MenuItem key={y.id} value={y.id}>
                {y.name}
                {y.is_current ? " (Current)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          disabled={!yearId}
        >
          Add Term / Semester
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Weightage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {terms.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  {new Date(t.start_date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(t.end_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{t.weightage}%</TableCell>
                <TableCell>
                  <Chip
                    label={t.is_active ? "Active" : "Archived"}
                    color={t.is_active ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => setDeleteTermState(t)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {terms.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>No terms found.</TableCell>
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
        <DialogTitle>Add Term / Semester</DialogTitle>
        <DialogContent>
          <TextField
            label="Name (e.g. Term 1 / Semester 1)"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.start_date}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value })
              }
            />
            <TextField
              type="date"
              label="End Date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </Box>
          <TextField
            label="Weightage (%)"
            type="number"
            fullWidth
            margin="normal"
            value={form.weightage}
            onChange={(e) => setForm({ ...form, weightage: e.target.value })}
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

      <Dialog
        open={!!editTermState}
        onClose={() => setEditTermState(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Term / Semester</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={editForm.name}
            onChange={(e) =>
              setEditForm({ ...editForm, name: e.target.value })
            }
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={editForm.start_date}
              onChange={(e) =>
                setEditForm({ ...editForm, start_date: e.target.value })
              }
            />
            <TextField
              type="date"
              label="End Date"
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={editForm.end_date}
              onChange={(e) =>
                setEditForm({ ...editForm, end_date: e.target.value })
              }
            />
          </Box>
          <TextField
            label="Weightage (%)"
            type="number"
            fullWidth
            margin="normal"
            value={editForm.weightage}
            onChange={(e) =>
              setEditForm({ ...editForm, weightage: e.target.value })
            }
          />
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
              setEditTermState(null);
              setEditForm({
                name: "",
                start_date: "",
                end_date: "",
                weightage: "0",
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
        open={!!deleteTermState}
        onClose={() => setDeleteTermState(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Term / Semester</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTermState?.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTermState(null)}>Cancel</Button>
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
