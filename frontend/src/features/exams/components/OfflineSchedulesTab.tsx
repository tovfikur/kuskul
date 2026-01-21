import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";

import {
  bulkCreateExamSchedules,
  createExamSchedule,
  deleteExamSchedule,
  getExamSchedules,
  updateExamSchedule,
  type ExamSchedule,
} from "../../../api/exams";
import { showToast } from "../../../app/toast";
import { OfflineBulkSchedulesDialog } from "./schedules/OfflineBulkSchedulesDialog";
import { OfflineScheduleDialog } from "./schedules/OfflineScheduleDialog";
import { OfflineSchedulesTable } from "./schedules/OfflineSchedulesTable";
import { newBulkRow } from "./schedules/scheduleUtils";
import type { BulkRow, Lookups, OfflineSchedulesTabProps, ScheduleForm } from "./schedules/types";

function defaultScheduleForm(examId: string, classId: string): ScheduleForm {
  return {
    exam_id: examId,
    class_id: classId,
    subject_id: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    room: "",
    max_marks: "100",
  };
}

export function OfflineSchedulesTab(props: OfflineSchedulesTabProps) {
  const { exams, classes, subjects, onForbidden } = props;

  const lookups: Lookups = useMemo(
    () => ({
      examById: new Map(exams.map((e) => [e.id, e])),
      classById: new Map(classes.map((c) => [c.id, c])),
      subjectById: new Map(subjects.map((s) => [s.id, s])),
    }),
    [classes, exams, subjects],
  );

  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams[0]?.id ?? "",
  );
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [rows, setRows] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamSchedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(() =>
    defaultScheduleForm(selectedExamId, selectedClassId),
  );

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSeed, setBulkSeed] = useState(1);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([newBulkRow(0)]);

  const selectedExam = selectedExamId
    ? lookups.examById.get(selectedExamId) ?? null
    : null;

  const load = async () => {
    if (!selectedExamId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getExamSchedules({
        exam_id: selectedExamId,
        class_id: selectedClassId || undefined,
      });
      setRows(list);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        onForbidden();
      } else {
        showToast({ severity: "error", message: "Failed to load schedules" });
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (!selectedExamId) {
      showToast({ severity: "error", message: "Select an exam first" });
      return;
    }
    setEditing(null);
    setForm(defaultScheduleForm(selectedExamId, selectedClassId));
    setDialogOpen(true);
  };

  const openEdit = (s: ExamSchedule) => {
    setEditing(s);
    setForm({
      exam_id: s.exam_id,
      class_id: s.class_id,
      subject_id: s.subject_id,
      exam_date: s.exam_date,
      start_time: s.start_time ?? "",
      end_time: s.end_time ?? "",
      room: s.room ?? "",
      max_marks: String(s.max_marks),
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const examId = form.exam_id;
    const classId = form.class_id;
    const subjectId = form.subject_id;
    const examDate = form.exam_date.trim();
    if (!examId || !classId || !subjectId || !examDate) {
      showToast({ severity: "error", message: "Exam, class, subject, and date are required" });
      return;
    }
    const maxMarks = Number(form.max_marks);
    if (!Number.isFinite(maxMarks) || maxMarks < 1 || maxMarks > 1000) {
      showToast({ severity: "error", message: "Max marks must be between 1 and 1000" });
      return;
    }
    const startTime = form.start_time.trim() || null;
    const endTime = form.end_time.trim() || null;
    const room = form.room.trim() || null;

    try {
      if (editing) {
        await updateExamSchedule(editing.id, {
          exam_date: examDate,
          start_time: startTime,
          end_time: endTime,
          room,
          max_marks: maxMarks,
        });
      } else {
        await createExamSchedule({
          exam_id: examId,
          class_id: classId,
          subject_id: subjectId,
          exam_date: examDate,
          start_time: startTime,
          end_time: endTime,
          room,
          max_marks: maxMarks,
        });
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({
        severity: "error",
        message: anyErr.response?.data?.detail || "Failed to save schedule",
      });
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    await load();
  };

  const doDelete = async (scheduleId: string) => {
    try {
      await deleteExamSchedule(scheduleId);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({ severity: "error", message: "Failed to delete schedule" });
      return;
    }
    await load();
  };

  const openBulk = () => {
    if (!selectedExamId) {
      showToast({ severity: "error", message: "Select an exam first" });
      return;
    }
    setBulkRows([newBulkRow(0)]);
    setBulkSeed(1);
    setBulkOpen(true);
  };

  const submitBulk = async () => {
    if (!selectedExamId) return;
    const items = bulkRows
      .map((r) => {
        const maxMarks = r.max_marks.trim() ? Number(r.max_marks.trim()) : 100;
        return {
          class_id: r.class_id,
          subject_id: r.subject_id,
          exam_date: r.exam_date.trim(),
          start_time: r.start_time.trim() || null,
          end_time: r.end_time.trim() || null,
          room: r.room.trim() || null,
          max_marks: maxMarks,
        };
      })
      .filter((x) => x.class_id && x.subject_id && x.exam_date);

    if (items.length === 0) {
      showToast({ severity: "error", message: "Add at least one valid row" });
      return;
    }
    for (const it of items) {
      if (!Number.isFinite(it.max_marks) || it.max_marks < 1 || it.max_marks > 1000) {
        showToast({ severity: "error", message: "Max marks must be between 1 and 1000" });
        return;
      }
    }

    try {
      await bulkCreateExamSchedules({
        items: items.map((it) => ({
          exam_id: selectedExamId,
          class_id: it.class_id,
          subject_id: it.subject_id,
          exam_date: it.exam_date,
          start_time: it.start_time,
          end_time: it.end_time,
          room: it.room,
          max_marks: it.max_marks,
        })),
      });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({
        severity: "error",
        message: anyErr.response?.data?.detail || "Failed to bulk create schedules",
      });
      return;
    }

    setBulkOpen(false);
    await load();
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
          <Typography variant="h6">Schedules</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Exam</InputLabel>
              <Select
                label="Exam"
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
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
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button variant="outlined" size="small" onClick={() => void load()}>
              Refresh
            </Button>
            <Button variant="outlined" size="small" onClick={openBulk}>
              Bulk Add
            </Button>
            <Button variant="contained" size="small" onClick={openCreate}>
              Add
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <OfflineSchedulesTable
          rows={rows}
          lookups={lookups}
          loading={loading}
          onEdit={openEdit}
          onDelete={(id) => void doDelete(id)}
        />
      </Paper>

      <OfflineScheduleDialog
        open={dialogOpen}
        title={editing ? "Edit Schedule" : "Add Schedule"}
        exams={exams}
        classes={classes}
        subjects={subjects}
        value={form}
        disableScopeEdits={Boolean(editing)}
        onChange={setForm}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSubmit={() => void submit()}
      />

      <OfflineBulkSchedulesDialog
        open={bulkOpen}
        selectedExam={selectedExam}
        classes={classes}
        subjects={subjects}
        rows={bulkRows}
        onRowsChange={setBulkRows}
        onClose={() => setBulkOpen(false)}
        onAddRow={() => {
          const next = bulkSeed;
          setBulkSeed((s) => s + 1);
          setBulkRows((p) => [...p, newBulkRow(next)]);
        }}
        onSubmit={() => void submitBulk()}
      />
    </Box>
  );
}

