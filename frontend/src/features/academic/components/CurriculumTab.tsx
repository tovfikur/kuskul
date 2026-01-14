import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import {
  createCurriculumUnit,
  getAcademicYears,
  getCurriculum,
  getSubjects,
  type AcademicYear,
  type CurriculumUnit,
  type Subject,
} from "../../../api/academic";

export default function CurriculumTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [yearId, setYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [units, setUnits] = useState<CurriculumUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    order_index: "0",
  });

  useEffect(() => {
    async function init() {
      const [y, s] = await Promise.all([getAcademicYears(), getSubjects()]);
      setYears(y);
      setSubjects(s);
      const current = y.find((it) => it.is_current);
      setYearId(current?.id || (y[0]?.id ?? ""));
    }
    init().catch(console.error);
  }, []);

  const load = async () => {
    if (!yearId || !subjectId) {
      setUnits([]);
      return;
    }
    const data = await getCurriculum({
      academic_year_id: yearId,
      subject_id: subjectId,
    });
    setUnits(data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [yearId, subjectId]);

  const handleCreate = async () => {
    try {
      await createCurriculumUnit({
        academic_year_id: yearId,
        subject_id: subjectId,
        title: form.title,
        description: form.description || null,
        order_index: parseInt(form.order_index || "0"),
      });
      setOpen(false);
      setForm({ title: "", description: "", order_index: "0" });
      load();
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
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 240 }} size="small">
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
          <FormControl sx={{ minWidth: 280 }} size="small">
            <InputLabel>Subject</InputLabel>
            <Select
              value={subjectId}
              label="Subject"
              onChange={(e) => setSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          disabled={!yearId || !subjectId}
        >
          Add Curriculum Unit
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.order_index}</TableCell>
                <TableCell>{u.title}</TableCell>
                <TableCell>{u.description || "-"}</TableCell>
              </TableRow>
            ))}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No curriculum units found.</TableCell>
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
        <DialogTitle>Add Curriculum Unit</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            minRows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Order"
            type="number"
            fullWidth
            margin="normal"
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!form.title}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
