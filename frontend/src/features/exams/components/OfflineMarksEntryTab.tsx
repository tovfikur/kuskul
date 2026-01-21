import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import {
  enterMarks,
  getExamSchedules,
  getMarks,
  type Exam,
  type ExamSchedule,
  type Mark,
} from "../../../api/exams";
import type { SchoolClass } from "../../../api/academic";
import type { Subject } from "../../../api/academic";
import { getStudents, type Student } from "../../../api/people";
import { showToast } from "../../../app/toast";

type Props = {
  exams: Exam[];
  classes: SchoolClass[];
  subjects: Subject[];
  onForbidden: () => void;
};

type Draft = {
  marks: string;
  is_absent: boolean;
  remarks: string;
};

function studentLabel(s: Student): string {
  const last = s.last_name ? ` ${s.last_name}` : "";
  return `${s.first_name}${last}`.trim();
}

export function OfflineMarksEntryTab(props: Props) {
  const { exams, classes, subjects, onForbidden } = props;

  const examById = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [classId, setClassId] = useState("");
  const [scheduleId, setScheduleId] = useState("");

  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  const selectedSchedule = schedules.find((s) => s.id === scheduleId) ?? null;
  const maxMarks = selectedSchedule?.max_marks ?? null;

  const loadSchedules = useCallback(
    async (eId: string, cId: string) => {
      if (!eId || !cId) {
        setSchedules([]);
        return;
      }
      try {
        const list = await getExamSchedules({ exam_id: eId, class_id: cId });
        setSchedules(list);
        if (!list.some((s) => s.id === scheduleId)) {
          setScheduleId(list[0]?.id ?? "");
        }
      } catch (err: unknown) {
        const anyErr = err as { response?: { status?: number } };
        if (anyErr.response?.status === 403) {
          onForbidden();
        } else {
          showToast({ severity: "error", message: "Failed to load schedules" });
        }
      }
    },
    [onForbidden, scheduleId],
  );

  const loadStudents = useCallback(
    async (cId: string) => {
      if (!cId) {
        setStudents([]);
        return;
      }
      try {
        const yearId = examById.get(examId)?.academic_year_id;
        const resp = await getStudents({
          class_id: cId,
          academic_year_id: yearId ?? undefined,
          limit: 200,
        });
        setStudents(resp.items);
      } catch (err: unknown) {
        const anyErr = err as { response?: { status?: number } };
        if (anyErr.response?.status === 403) {
          onForbidden();
        } else {
          showToast({ severity: "error", message: "Failed to load students" });
        }
      }
    },
    [examById, examId, onForbidden],
  );

  const loadMarks = useCallback(
    async (schedId: string) => {
      if (!schedId) {
        setMarks([]);
        return;
      }
      try {
        const list = await getMarks({ exam_schedule_id: schedId });
        setMarks(list);
      } catch (err: unknown) {
        const anyErr = err as { response?: { status?: number } };
        if (anyErr.response?.status === 403) {
          onForbidden();
        } else {
          showToast({ severity: "error", message: "Failed to load marks" });
        }
      }
    },
    [onForbidden],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await Promise.all([
        loadSchedules(examId, classId),
        loadStudents(classId),
      ]);
      setLoading(false);
    })();
  }, [classId, examId, loadSchedules, loadStudents]);

  useEffect(() => {
    void loadMarks(scheduleId);
  }, [loadMarks, scheduleId]);

  useEffect(() => {
    const markByStudent = new Map(marks.map((m) => [m.student_id, m]));
    const next: Record<string, Draft> = {};
    for (const s of students) {
      const m = markByStudent.get(s.id);
      next[s.id] = {
        marks: m?.marks_obtained != null ? String(m.marks_obtained) : "",
        is_absent: m?.is_absent ?? false,
        remarks: m?.remarks ?? "",
      };
    }
    setDraft(next);
  }, [marks, students]);

  const scheduleLabel = (sched: ExamSchedule): string => {
    const examName = examById.get(sched.exam_id)?.name ?? "Exam";
    const clsName =
      classes.find((c) => c.id === sched.class_id)?.name ?? "Class";
    const subjectName = subjectById.get(sched.subject_id)?.name ?? "Subject";
    return `${examName} • ${clsName} • ${subjectName} • ${sched.exam_date}`;
  };

  const save = async () => {
    if (!selectedSchedule) {
      showToast({ severity: "error", message: "Select a schedule" });
      return;
    }
    const max = selectedSchedule.max_marks;

    let payloadItems: Array<{
      student_id: string;
      marks_obtained: number | null;
      is_absent: boolean;
      remarks: string | null;
    }> = [];
    try {
      const originalByStudent = new Map(marks.map((m) => [m.student_id, m]));
      payloadItems = Object.entries(draft)
        .map(([student_id, row]) => {
          const orig = originalByStudent.get(student_id);
          const remarks = row.remarks.trim() || null;
          if (remarks && remarks.length > 255) {
            throw new Error("Remarks must be at most 255 characters");
          }

          const marksText = row.marks.trim();
          const marks_obtained = row.is_absent
            ? null
            : marksText === ""
              ? null
              : Number(marksText);

          if (!row.is_absent && marksText !== "") {
            const numeric = Number(marksText);
            if (!Number.isFinite(numeric)) {
              throw new Error("Marks must be a valid number");
            }
            if (!Number.isInteger(numeric)) {
              throw new Error("Marks must be an integer");
            }
            if (numeric < 0 || numeric > max) {
              throw new Error(`Marks must be 0–${max}`);
            }
          }

          const origMarks = orig?.marks_obtained ?? null;
          const origAbsent = orig?.is_absent ?? false;
          const origRemarks = orig?.remarks ?? null;
          const changed =
            origMarks !== marks_obtained ||
            origAbsent !== row.is_absent ||
            (origRemarks ?? null) !== remarks;

          if (!changed) return null;
          return {
            student_id,
            marks_obtained,
            is_absent: row.is_absent,
            remarks,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null);
    } catch (e: unknown) {
      showToast({
        severity: "error",
        message: e instanceof Error ? e.message : "Invalid input",
      });
      return;
    }

    if (payloadItems.length === 0) {
      showToast({
        severity: "info",
        message: "No changes to save",
      });
      return;
    }

    setSaving(true);
    try {
      await enterMarks({
        exam_schedule_id: selectedSchedule.id,
        items: payloadItems,
      });
      showToast({ severity: "success", message: "Marks saved" });
    } catch (err: unknown) {
      const anyErr = err as {
        response?: { status?: number; data?: { detail?: unknown } };
      };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      const detail = anyErr.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? String(
                (detail[0] as { msg?: unknown } | undefined)?.msg ??
                  "Validation error",
              )
            : "Failed to save marks";
      showToast({
        severity: "error",
        message,
      });
      return;
    } finally {
      setSaving(false);
    }
    await loadMarks(selectedSchedule.id);
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
          <Typography variant="h6">Marks Entry</Typography>
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
                <MenuItem value="">Select...</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Schedule</InputLabel>
              <Select
                label="Schedule"
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                disabled={!examId || !classId}
              >
                <MenuItem value="">Select...</MenuItem>
                {schedules.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {scheduleLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void loadMarks(scheduleId)}
              disabled={!scheduleId}
            >
              Reload
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => void save()}
              disabled={!scheduleId || saving}
            >
              Save
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {!loading && classId && students.length === 0 && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.default",
            }}
          >
            <Typography variant="subtitle2">
              No students found for this class.
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Make sure students are enrolled in this class for the selected
              academic year.
            </Typography>
          </Box>
        )}

        {maxMarks != null && (
          <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
            Max marks: {maxMarks}
          </Typography>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Admission No</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Marks</TableCell>
                <TableCell>Absent</TableCell>
                <TableCell>Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s) => {
                const row = draft[s.id] || {
                  marks: "",
                  is_absent: false,
                  remarks: "",
                };
                return (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.admission_no ?? "-"}</TableCell>
                    <TableCell>{studentLabel(s)}</TableCell>
                    <TableCell sx={{ width: 140 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={row.marks}
                        disabled={row.is_absent || !scheduleId}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            [s.id]: { ...row, marks: e.target.value },
                          }))
                        }
                        inputProps={{ min: 0, max: maxMarks ?? 1000 }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <Switch
                        checked={row.is_absent}
                        disabled={!scheduleId}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            [s.id]: {
                              ...row,
                              is_absent: e.target.checked,
                              marks: e.target.checked ? "" : row.marks,
                            },
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={row.remarks}
                        disabled={!scheduleId}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            [s.id]: { ...row, remarks: e.target.value },
                          }))
                        }
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    {!classId
                      ? "Select a class to load students."
                      : "No students found for this class/year."}
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
