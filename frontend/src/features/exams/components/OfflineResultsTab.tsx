import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
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
  Typography,
} from "@mui/material";

import {
  getResults,
  publishExam,
  updateExam,
  type Exam,
  type Result,
} from "../../../api/exams";
import { getGrades, type Grade, type SchoolClass } from "../../../api/academic";
import { getStudents, type Student } from "../../../api/people";
import { showToast } from "../../../app/toast";

type Props = {
  exams: Exam[];
  classes: SchoolClass[];
  onForbidden: () => void;
  onRefreshExams: () => Promise<void>;
};

function studentName(s: Student): string {
  const last = s.last_name ? ` ${s.last_name}` : "";
  return `${s.first_name}${last}`.trim();
}

function statusChip(exam: Exam | null) {
  if (!exam) return null;
  const label = exam.status || (exam.is_published ? "published" : "draft");
  const color = label === "published" ? "success" : "default";
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}

export function OfflineResultsTab(props: Props) {
  const { exams, classes, onForbidden, onRefreshExams } = props;

  const examById = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [classId, setClassId] = useState("");

  const [grades, setGrades] = useState<Grade[]>([]);
  const gradeById = useMemo(
    () => new Map(grades.map((g) => [g.id, g])),
    [grades],
  );

  const [students, setStudents] = useState<Student[]>([]);
  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students],
  );

  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedExam = examId ? examById.get(examId) ?? null : null;

  useEffect(() => {
    void (async () => {
      try {
        const g = await getGrades();
        setGrades(g);
      } catch {
        setGrades([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!classId) {
        setStudents([]);
        return;
      }
      try {
        const resp = await getStudents({ class_id: classId, limit: 200 });
        setStudents(resp.items);
      } catch (err: unknown) {
        const anyErr = err as { response?: { status?: number } };
        if (anyErr.response?.status === 403) {
          onForbidden();
          return;
        }
        setStudents([]);
      }
    })();
  }, [classId, onForbidden]);

  const generate = async () => {
    if (!examId) {
      showToast({ severity: "error", message: "Select an exam" });
      return;
    }
    setLoading(true);
    try {
      const res = await getResults({
        exam_id: examId,
        class_id: classId || undefined,
      });
      setRows(res);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({
        severity: "error",
        message: anyErr.response?.data?.detail || "Failed to generate results",
      });
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!examId) return;
    try {
      await publishExam(examId);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({ severity: "error", message: "Failed to publish" });
      return;
    }
    await onRefreshExams();
  };

  const toggleLock = async () => {
    if (!selectedExam) return;
    try {
      await updateExam(selectedExam.id, {
        is_result_editable: !selectedExam.is_result_editable,
      });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({ severity: "error", message: "Failed to update lock state" });
      return;
    }
    await onRefreshExams();
  };

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6">Results</Typography>
            {statusChip(selectedExam)}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Exam</InputLabel>
              <Select
                label="Exam"
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
              >
                <MenuItem value="">Select...</MenuItem>
                {exams.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Class</InputLabel>
              <Select
                label="Class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={() => void generate()}>
              Generate/Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void publish()}
              disabled={!selectedExam || selectedExam.is_published}
            >
              Publish
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => void toggleLock()}
              disabled={!selectedExam}
            >
              {selectedExam && selectedExam.is_result_editable ? "Lock" : "Unlock"}
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {selectedExam && (
          <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
            Published: {selectedExam.is_published ? "Yes" : "No"} • Publish date: {selectedExam.result_publish_date || "-"} • Editable: {selectedExam.is_result_editable ? "Yes" : "No"}
          </Typography>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Obtained</TableCell>
                <TableCell>Percentage</TableCell>
                <TableCell>Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const s = studentById.get(r.student_id);
                const g = r.grade_id ? gradeById.get(r.grade_id) : null;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ maxWidth: 420 }}>
                      {s ? studentName(s) : r.student_id}
                    </TableCell>
                    <TableCell>{r.total_marks}</TableCell>
                    <TableCell>{r.obtained_marks}</TableCell>
                    <TableCell>{r.percentage.toFixed(2)}%</TableCell>
                    <TableCell>{g ? g.name : "-"}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    Select an exam and click Generate/Refresh.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
