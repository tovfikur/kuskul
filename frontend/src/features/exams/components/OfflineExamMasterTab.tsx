import { useMemo, useState } from "react";
import { Box, Button, Divider, Paper, Typography } from "@mui/material";

import {
  createExam,
  deleteExam,
  publishExam,
  updateExam,
  type Exam,
  type ExamType,
} from "../../../api/exams";
import { showToast } from "../../../app/toast";
import { OfflineExamMasterDialog } from "./examMaster/OfflineExamMasterDialog";
import { OfflineExamMasterTable } from "./examMaster/OfflineExamMasterTable";
import type {
  ExamForm,
  ExamTypeOption,
  OfflineExamMasterTabProps,
} from "./examMaster/types";

function defaultForm(examTypeOptions: ExamTypeOption[]): ExamForm {
  return {
    name: "",
    exam_code: "",
    exam_type: examTypeOptions.some((o) => o.value === "final")
      ? "final"
      : "Other",
    exam_type_custom: "",
    status: "draft",
    start_date: "",
    end_date: "",
    weight_percentage: "",
    included_in_final_result: true,
    best_of_count: "",
    aggregation_method: "sum",
    counts_for_gpa: true,
    result_entry_deadline: "",
    result_publish_date: "",
    is_result_editable: true,
    instructions: "",
  };
}

function mapExamToForm(e: Exam, examTypes: ExamType[]): ExamForm {
  const label = e.exam_type ?? "";
  const typeMatch =
    (e.exam_type_code
      ? examTypes.find((t) => t.code === e.exam_type_code)
      : undefined) ??
    (label
      ? examTypes.find((t) => t.label.toLowerCase() === label.toLowerCase())
      : undefined) ??
    undefined;

  return {
    name: e.name ?? "",
    exam_code: e.exam_code ?? "",
    exam_type: typeMatch ? typeMatch.code : "Other",
    exam_type_custom: typeMatch ? "" : (e.exam_type ?? ""),
    status: e.status ?? "draft",
    start_date: e.start_date ?? "",
    end_date: e.end_date ?? "",
    weight_percentage:
      e.weight_percentage != null ? String(e.weight_percentage) : "",
    included_in_final_result: Boolean(e.included_in_final_result),
    best_of_count: e.best_of_count != null ? String(e.best_of_count) : "",
    aggregation_method: e.aggregation_method ?? "sum",
    counts_for_gpa: Boolean(e.counts_for_gpa),
    result_entry_deadline: e.result_entry_deadline ?? "",
    result_publish_date: e.result_publish_date ?? "",
    is_result_editable: Boolean(e.is_result_editable),
    instructions: e.instructions ?? "",
  };
}

function buildExamTypeOptions(examTypes: ExamType[]): ExamTypeOption[] {
  const list = examTypes
    .filter((t) => t.is_active)
    .map((t) => ({
      value: t.code,
      label: `${t.label}${t.frequency_hint ? ` — ${t.frequency_hint}` : ""}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  list.push({ value: "Other", label: "Other (custom)" });
  return list;
}

export function OfflineExamMasterTab(props: OfflineExamMasterTabProps) {
  const {
    academicYearName,
    academicYearId,
    exams,
    examTypes,
    loading,
    onRefresh,
    onForbidden,
  } = props;

  const examTypeOptions = useMemo(
    () => buildExamTypeOptions(examTypes),
    [examTypes],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState<ExamForm>(() =>
    defaultForm(examTypeOptions),
  );

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm(examTypeOptions));
    setDialogOpen(true);
  };

  const openEdit = (e: Exam) => {
    setEditing(e);
    setForm(mapExamToForm(e, examTypes));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handlePublish = async (examId: string) => {
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
    await onRefresh();
  };

  const handleDelete = async (examId: string) => {
    try {
      await deleteExam(examId);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({ severity: "error", message: "Failed to delete" });
      return;
    }
    await onRefresh();
  };

  const submit = async () => {
    const name = form.name.trim();
    if (!name) {
      showToast({ severity: "error", message: "Exam name is required" });
      return;
    }

    const examCode = form.exam_code.trim() || null;
    const examTypeCode =
      form.exam_type !== "Other" && form.exam_type.trim()
        ? form.exam_type.trim()
        : null;
    const examTypeLabel =
      form.exam_type === "Other" ? form.exam_type_custom.trim() : "";
    if (!examTypeCode && !examTypeLabel) {
      showToast({ severity: "error", message: "Exam type is required" });
      return;
    }

    const startDate = form.start_date.trim() || null;
    const endDate = form.end_date.trim() || null;
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showToast({
        severity: "error",
        message: "End date must be after start date",
      });
      return;
    }

    const weight = form.weight_percentage.trim()
      ? Number(form.weight_percentage.trim())
      : null;
    if (
      weight != null &&
      (!Number.isFinite(weight) || weight < 0 || weight > 100)
    ) {
      showToast({
        severity: "error",
        message: "Weight must be between 0 and 100",
      });
      return;
    }

    const bestOf = form.best_of_count.trim()
      ? Number(form.best_of_count.trim())
      : null;
    if (
      bestOf != null &&
      (!Number.isFinite(bestOf) || bestOf < 1 || bestOf > 100)
    ) {
      showToast({
        severity: "error",
        message: "Best-of count must be between 1 and 100",
      });
      return;
    }

    const status = form.status.trim() || "draft";
    const resultEntryDeadline = form.result_entry_deadline.trim() || null;
    const resultPublishDate = form.result_publish_date.trim() || null;
    const instructions = form.instructions.trim() || null;

    try {
      if (editing) {
        await updateExam(editing.id, {
          name,
          exam_code: examCode,
          exam_type_code: examTypeCode,
          exam_type: examTypeCode ? null : examTypeLabel,
          status,
          start_date: startDate,
          end_date: endDate,
          weight_percentage: weight,
          included_in_final_result: form.included_in_final_result,
          best_of_count: bestOf,
          aggregation_method: form.aggregation_method.trim() || null,
          counts_for_gpa: form.counts_for_gpa,
          result_entry_deadline: resultEntryDeadline,
          result_publish_date: resultPublishDate,
          is_result_editable: form.is_result_editable,
          instructions,
        });
      } else {
        await createExam({
          academic_year_id: academicYearId,
          name,
          exam_code: examCode,
          exam_type_code: examTypeCode,
          exam_type: examTypeCode ? null : examTypeLabel,
          status,
          start_date: startDate,
          end_date: endDate,
          weight_percentage: weight,
          included_in_final_result: form.included_in_final_result,
          best_of_count: bestOf,
          aggregation_method: form.aggregation_method.trim() || null,
          counts_for_gpa: form.counts_for_gpa,
          result_entry_deadline: resultEntryDeadline,
          result_publish_date: resultPublishDate,
          is_result_editable: form.is_result_editable,
          instructions,
        });
      }
    } catch (err: unknown) {
      const anyErr = err as {
        response?: { status?: number; data?: { detail?: string } };
      };
      if (anyErr.response?.status === 403) {
        onForbidden();
        return;
      }
      showToast({
        severity: "error",
        message: anyErr.response?.data?.detail || "Failed to save exam",
      });
      return;
    }

    closeDialog();
    await onRefresh();
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
          }}
        >
          <Box>
            <Typography variant="h6">Exam Master</Typography>
            <Typography color="text.secondary" variant="body2">
              Academic year: {academicYearName}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void onRefresh()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button variant="contained" size="small" onClick={openCreate}>
              Add
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <OfflineExamMasterTable
          exams={exams}
          onEdit={openEdit}
          onPublish={(id) => void handlePublish(id)}
          onDelete={(id) => void handleDelete(id)}
        />
      </Paper>

      <OfflineExamMasterDialog
        open={dialogOpen}
        title={editing ? "Edit Exam" : "Add Exam"}
        examTypeOptions={examTypeOptions}
        value={form}
        onChange={setForm}
        onClose={closeDialog}
        onSubmit={() => void submit()}
      />
    </Box>
  );
}
