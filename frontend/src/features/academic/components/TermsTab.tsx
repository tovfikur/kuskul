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
} from "@mui/material";
import {
  createTerm,
  getAcademicYears,
  getTerms,
  type AcademicYear,
  type Term,
} from "../../../api/academic";

export default function TermsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
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
              </TableRow>
            ))}
            {terms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No terms found.</TableCell>
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
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
    </Box>
  );
}
