import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid2 from "@mui/material/Grid";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import EventNoteIcon from "@mui/icons-material/EventNote";
import FactCheckIcon from "@mui/icons-material/FactCheck";

import {
  bulkAddOnlineExamConfigQuestions,
  createOnlineExamConfig,
  createQuestionBankCategory,
  createQuestionBankQuestion,
  deleteOnlineExamConfig,
  deleteQuestionBankCategory,
  deleteQuestionBankQuestion,
  getExamSchedules,
  getExamTypes,
  getExams,
  getOnlineExamAttempts,
  getOnlineExamConfigQuestions,
  getOnlineExamConfigs,
  getQuestionBankCategories,
  getQuestionBankQuestions,
  updateOnlineExamConfig,
  updateQuestionBankQuestion,
  type ExamType,
  type Exam,
  type ExamSchedule,
  type OnlineExamAttempt,
  type OnlineExamConfig,
  type OnlineExamConfigQuestion,
  type QuestionBankCategory,
  type QuestionBankQuestion,
} from "../../api/exams";
import {
  getClasses,
  getCurrentAcademicYear,
  getSubjects,
  type AcademicYear,
  type SchoolClass,
  type Subject,
} from "../../api/academic";
import { showToast } from "../../app/toast";

import { OfflineExamMasterTab } from "./components/OfflineExamMasterTab";
import { OfflineSchedulesTab } from "./components/OfflineSchedulesTab";
import { OfflineMarksEntryTab } from "./components/OfflineMarksEntryTab";
import { OfflineResultsTab } from "./components/OfflineResultsTab";

type TabPanelProps = {
  children?: ReactNode;
  index: number;
  value: number;
};

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function parseJsonObject(
  raw: string,
):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: {} };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "JSON must be an object" };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, message: "Invalid JSON" };
  }
}

export default function ExamsPage() {
  const [tab, setTab] = useState(0);
  const [onlineTab, setOnlineTab] = useState(0);
  const [offlineTab, setOfflineTab] = useState(0);

  const [offlineInitialized, setOfflineInitialized] = useState(false);
  const [offlineInitLoading, setOfflineInitLoading] = useState(false);
  const [offlineForbidden, setOfflineForbidden] = useState(false);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [offlineExams, setOfflineExams] = useState<Exam[]>([]);
  const [offlineExamsLoading, setOfflineExamsLoading] = useState(false);
  const [offlineExamTypes, setOfflineExamTypes] = useState<ExamType[]>([]);

  const [onlineInitialized, setOnlineInitialized] = useState(false);
  const [onlineInitLoading, setOnlineInitLoading] = useState(false);
  const [onlineForbidden, setOnlineForbidden] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  const [categories, setCategories] = useState<QuestionBankCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const [questions, setQuestions] = useState<QuestionBankQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionFilters, setQuestionFilters] = useState<{
    category_id: string;
    subject_id: string;
    active: "all" | "active" | "inactive";
  }>({ category_id: "", subject_id: "", active: "all" });
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionBankQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    category_id: "",
    subject_id: "",
    question_type: "mcq_single",
    prompt: "",
    points: 1,
    difficulty: "",
    tags: "",
    is_active: true,
    options_json: "",
    correct_answer_json: "",
  });

  const [configs, setConfigs] = useState<OnlineExamConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<OnlineExamConfig | null>(
    null,
  );
  const [configForm, setConfigForm] = useState({
    exam_schedule_id: "",
    duration_minutes: 60,
    shuffle_questions: false,
    shuffle_options: false,
    allow_backtrack: true,
    proctoring_enabled: false,
    attempt_limit: 1,
    starts_at_local: "",
    ends_at_local: "",
    instructions: "",
  });

  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [configQuestions, setConfigQuestions] = useState<
    OnlineExamConfigQuestion[]
  >([]);
  const [configQuestionsLoading, setConfigQuestionsLoading] = useState(false);
  const [addQuestionsDialogOpen, setAddQuestionsDialogOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<
    QuestionBankQuestion[]
  >([]);
  const [availableQuestionsLoading, setAvailableQuestionsLoading] =
    useState(false);
  const [addQuestionsFilters, setAddQuestionsFilters] = useState<{
    category_id: string;
    subject_id: string;
    activeOnly: boolean;
  }>({ category_id: "", subject_id: "", activeOnly: true });
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<
    Record<string, boolean>
  >({});

  const [attempts, setAttempts] = useState<OnlineExamAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const classById = useMemo(
    () => new Map(classes.map((c) => [c.id, c])),
    [classes],
  );
  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );
  const examById = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const questionById = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const scheduleLabel = useCallback(
    (sched: ExamSchedule): string => {
      const examName = examById.get(sched.exam_id)?.name ?? "Exam";
      const className = classById.get(sched.class_id)?.name ?? "Class";
      const subjectName = subjectById.get(sched.subject_id)?.name ?? "Subject";
      const time =
        sched.start_time && sched.end_time
          ? `${sched.start_time}–${sched.end_time}`
          : null;
      return `${examName} • ${className} • ${subjectName} • ${sched.exam_date}${time ? ` • ${time}` : ""}`;
    },
    [classById, examById, subjectById],
  );

  const handleOnlineForbidden = useCallback(() => {
    setOnlineForbidden(true);
    setCategories([]);
    setQuestions([]);
    setConfigs([]);
    setConfigQuestions([]);
    setAttempts([]);
    setCategoryDialogOpen(false);
    setQuestionDialogOpen(false);
    setConfigDialogOpen(false);
    setAddQuestionsDialogOpen(false);
  }, []);

  const handleOfflineForbidden = useCallback(() => {
    setOfflineForbidden(true);
    setCurrentYear(null);
    setOfflineExams([]);
  }, []);

  const questionPreview = useCallback((prompt: string) => {
    const text = prompt.replace(/\s+/g, " ").trim();
    if (text.length <= 120) return text;
    return `${text.slice(0, 117)}...`;
  }, []);

  const initOffline = useCallback(async () => {
    if (offlineInitialized || offlineInitLoading) return;
    setOfflineInitLoading(true);
    setOfflineForbidden(false);
    try {
      const [y, types, c, s] = await Promise.all([
        getCurrentAcademicYear(),
        getExamTypes(),
        getClasses(),
        getSubjects(),
      ]);
      setCurrentYear(y);
      setOfflineExamTypes(types);
      setClasses(c);
      setSubjects(s);
      const list = await getExams({ academic_year_id: y.id });
      setOfflineExams(list);
      setOfflineInitialized(true);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOfflineForbidden();
      }
    } finally {
      setOfflineInitLoading(false);
    }
  }, [handleOfflineForbidden, offlineInitLoading, offlineInitialized]);

  const loadOfflineExams = useCallback(async () => {
    if (!currentYear) return;
    setOfflineExamsLoading(true);
    try {
      const list = await getExams({ academic_year_id: currentYear.id });
      setOfflineExams(list);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOfflineForbidden();
      }
    } finally {
      setOfflineExamsLoading(false);
    }
  }, [currentYear, handleOfflineForbidden]);

  const initOnline = useCallback(async () => {
    if (onlineInitialized || onlineInitLoading) return;
    setOnlineInitLoading(true);
    setOnlineForbidden(false);
    try {
      const [c, s, e, sch] = await Promise.all([
        getClasses(),
        getSubjects(),
        getExams(),
        getExamSchedules(),
      ]);
      setClasses(c);
      setSubjects(s);
      setExams(e);
      setSchedules(sch);
      setOnlineInitialized(true);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setOnlineInitLoading(false);
    }
  }, [handleOnlineForbidden, onlineInitialized, onlineInitLoading]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const rows = await getQuestionBankCategories();
      setCategories(rows);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setCategoriesLoading(false);
    }
  }, [handleOnlineForbidden]);

  const loadQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const rows = await getQuestionBankQuestions({
        category_id: questionFilters.category_id || undefined,
        subject_id: questionFilters.subject_id || undefined,
        is_active:
          questionFilters.active === "all"
            ? undefined
            : questionFilters.active === "active",
      });
      setQuestions(rows);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setQuestionsLoading(false);
    }
  }, [
    handleOnlineForbidden,
    questionFilters.active,
    questionFilters.category_id,
    questionFilters.subject_id,
  ]);

  const loadConfigs = useCallback(async () => {
    setConfigsLoading(true);
    try {
      const rows = await getOnlineExamConfigs();
      setConfigs(rows);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setConfigsLoading(false);
    }
  }, [handleOnlineForbidden]);

  const loadConfigQuestions = useCallback(
    async (configId: string) => {
      setConfigQuestionsLoading(true);
      try {
        const rows = await getOnlineExamConfigQuestions(configId);
        setConfigQuestions(rows);
      } catch (err: unknown) {
        const anyErr = err as { response?: { status?: number } };
        if (anyErr.response?.status === 403) {
          handleOnlineForbidden();
        }
      } finally {
        setConfigQuestionsLoading(false);
      }
    },
    [handleOnlineForbidden],
  );

  const loadAttempts = useCallback(async () => {
    setAttemptsLoading(true);
    try {
      const rows = await getOnlineExamAttempts();
      setAttempts(rows);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setAttemptsLoading(false);
    }
  }, [handleOnlineForbidden]);

  const loadAvailableQuestions = useCallback(async () => {
    setAvailableQuestionsLoading(true);
    try {
      const rows = await getQuestionBankQuestions({
        category_id: addQuestionsFilters.category_id || undefined,
        subject_id: addQuestionsFilters.subject_id || undefined,
        is_active: addQuestionsFilters.activeOnly ? true : undefined,
      });
      setAvailableQuestions(rows);
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
    } finally {
      setAvailableQuestionsLoading(false);
    }
  }, [
    addQuestionsFilters.activeOnly,
    addQuestionsFilters.category_id,
    addQuestionsFilters.subject_id,
    handleOnlineForbidden,
  ]);

  useEffect(() => {
    if (tab === 0 || tab === 1) {
      void initOffline().catch(() => {});
    }
    if (tab === 2) {
      void initOnline().catch(() => {});
    }
  }, [initOffline, initOnline, tab]);

  useEffect(() => {
    if (tab === 1 && offlineInitialized && !offlineForbidden) {
      void loadOfflineExams().catch(() => {});
    }

    if (!onlineInitialized || onlineForbidden) return;
    if (tab !== 2) return;

    if (onlineTab === 0) {
      void loadCategories().catch(() => {});
      void loadQuestions().catch(() => {});
    }

    if (onlineTab === 1) {
      void loadConfigs().catch(() => {});
    }

    if (onlineTab === 2) {
      void loadAttempts().catch(() => {});
    }
  }, [
    loadAttempts,
    loadCategories,
    loadConfigs,
    loadOfflineExams,
    loadQuestions,
    offlineForbidden,
    offlineInitialized,
    onlineForbidden,
    onlineInitialized,
    onlineTab,
    tab,
  ]);

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      category_id: "",
      subject_id: "",
      question_type: "mcq_single",
      prompt: "",
      points: 1,
      difficulty: "",
      tags: "",
      is_active: true,
      options_json: "",
      correct_answer_json: "",
    });
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: QuestionBankQuestion) => {
    setEditingQuestion(q);
    setQuestionForm({
      category_id: q.category_id ?? "",
      subject_id: q.subject_id ?? "",
      question_type: q.question_type,
      prompt: q.prompt,
      points: q.points,
      difficulty: q.difficulty ?? "",
      tags: q.tags ?? "",
      is_active: q.is_active,
      options_json: q.options ? JSON.stringify(q.options, null, 2) : "",
      correct_answer_json: "",
    });
    setQuestionDialogOpen(true);
  };

  const submitQuestion = async () => {
    const prompt = questionForm.prompt.trim();
    if (!prompt) {
      showToast({ severity: "error", message: "Question prompt is required" });
      return;
    }
    if (!questionForm.question_type.trim()) {
      showToast({ severity: "error", message: "Question type is required" });
      return;
    }

    const optionsRes = parseJsonObject(questionForm.options_json);
    if (!optionsRes.ok) {
      showToast({
        severity: "error",
        message: `Options: ${optionsRes.message}`,
      });
      return;
    }

    const correctTrimmed = questionForm.correct_answer_json.trim();
    const correctRes = correctTrimmed
      ? parseJsonObject(correctTrimmed)
      : { ok: true as const, value: {} };
    if (!correctRes.ok) {
      showToast({
        severity: "error",
        message: `Correct answer: ${correctRes.message}`,
      });
      return;
    }

    const optionsPayload = questionForm.options_json.trim()
      ? optionsRes.value
      : null;
    const correctPayload = correctTrimmed ? correctRes.value : null;

    try {
      if (editingQuestion) {
        await updateQuestionBankQuestion(editingQuestion.id, {
          category_id: questionForm.category_id || null,
          subject_id: questionForm.subject_id || null,
          question_type: questionForm.question_type.trim(),
          prompt,
          options: optionsPayload,
          correct_answer: correctPayload,
          points: Number(questionForm.points),
          difficulty: questionForm.difficulty.trim() || null,
          tags: questionForm.tags.trim() || null,
          is_active: questionForm.is_active,
        });
      } else {
        await createQuestionBankQuestion({
          category_id: questionForm.category_id || null,
          subject_id: questionForm.subject_id || null,
          question_type: questionForm.question_type.trim(),
          prompt,
          options: optionsPayload,
          correct_answer: correctPayload,
          points: Number(questionForm.points),
          difficulty: questionForm.difficulty.trim() || null,
          tags: questionForm.tags.trim() || null,
          is_active: questionForm.is_active,
        });
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
      return;
    }

    setQuestionDialogOpen(false);
    setEditingQuestion(null);
    await loadQuestions();
  };

  const submitCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      showToast({ severity: "error", message: "Category name is required" });
      return;
    }
    try {
      await createQuestionBankCategory({ name });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
      return;
    }
    setCategoryDialogOpen(false);
    setCategoryName("");
    await loadCategories();
  };

  const openCreateConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      exam_schedule_id: "",
      duration_minutes: 60,
      shuffle_questions: false,
      shuffle_options: false,
      allow_backtrack: true,
      proctoring_enabled: false,
      attempt_limit: 1,
      starts_at_local: "",
      ends_at_local: "",
      instructions: "",
    });
    setConfigDialogOpen(true);
  };

  const openEditConfig = (cfg: OnlineExamConfig) => {
    setEditingConfig(cfg);
    setConfigForm({
      exam_schedule_id: cfg.exam_schedule_id,
      duration_minutes: cfg.duration_minutes,
      shuffle_questions: cfg.shuffle_questions,
      shuffle_options: cfg.shuffle_options,
      allow_backtrack: cfg.allow_backtrack,
      proctoring_enabled: cfg.proctoring_enabled,
      attempt_limit: cfg.attempt_limit,
      starts_at_local: cfg.starts_at
        ? new Date(cfg.starts_at).toISOString().slice(0, 16)
        : "",
      ends_at_local: cfg.ends_at
        ? new Date(cfg.ends_at).toISOString().slice(0, 16)
        : "",
      instructions: cfg.instructions ?? "",
    });
    setConfigDialogOpen(true);
  };

  const submitConfig = async () => {
    if (!configForm.exam_schedule_id) {
      showToast({ severity: "error", message: "Exam schedule is required" });
      return;
    }
    const duration = Number(configForm.duration_minutes);
    if (!Number.isFinite(duration) || duration < 5) {
      showToast({
        severity: "error",
        message: "Duration must be at least 5 minutes",
      });
      return;
    }
    const attemptLimit = Number(configForm.attempt_limit);
    if (!Number.isFinite(attemptLimit) || attemptLimit < 1) {
      showToast({
        severity: "error",
        message: "Attempt limit must be at least 1",
      });
      return;
    }
    const startsAt = configForm.starts_at_local
      ? new Date(configForm.starts_at_local).toISOString()
      : null;
    const endsAt = configForm.ends_at_local
      ? new Date(configForm.ends_at_local).toISOString()
      : null;
    if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
      showToast({
        severity: "error",
        message: "End time must be after start time",
      });
      return;
    }

    try {
      if (editingConfig) {
        await updateOnlineExamConfig(editingConfig.id, {
          duration_minutes: duration,
          shuffle_questions: configForm.shuffle_questions,
          shuffle_options: configForm.shuffle_options,
          allow_backtrack: configForm.allow_backtrack,
          proctoring_enabled: configForm.proctoring_enabled,
          attempt_limit: attemptLimit,
          starts_at: startsAt,
          ends_at: endsAt,
          instructions: configForm.instructions.trim() || null,
        });
      } else {
        await createOnlineExamConfig({
          exam_schedule_id: configForm.exam_schedule_id,
          duration_minutes: duration,
          shuffle_questions: configForm.shuffle_questions,
          shuffle_options: configForm.shuffle_options,
          allow_backtrack: configForm.allow_backtrack,
          proctoring_enabled: configForm.proctoring_enabled,
          attempt_limit: attemptLimit,
          starts_at: startsAt,
          ends_at: endsAt,
          instructions: configForm.instructions.trim() || null,
        });
      }
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
      return;
    }

    setConfigDialogOpen(false);
    setEditingConfig(null);
    await loadConfigs();
  };

  const openAddQuestions = async () => {
    if (!selectedConfigId) return;
    setSelectedQuestionIds({});
    setAddQuestionsDialogOpen(true);
    await loadAvailableQuestions();
  };

  const submitAddQuestions = async () => {
    if (!selectedConfigId) return;
    const ids = Object.entries(selectedQuestionIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      showToast({ severity: "error", message: "Select at least one question" });
      return;
    }
    try {
      await bulkAddOnlineExamConfigQuestions(selectedConfigId, {
        items: ids.map((id) => ({
          question_id: id,
          order_index: null,
          points: null,
        })),
      });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number } };
      if (anyErr.response?.status === 403) {
        handleOnlineForbidden();
      }
      return;
    }
    setAddQuestionsDialogOpen(false);
    await loadConfigQuestions(selectedConfigId);
  };

  const overviewTiles = [
    {
      title: "Exam Master",
      subtitle: "Manage exams and lifecycle",
      offlineTab: 0,
      icon: <FactCheckIcon />,
      gradient: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
    },
    {
      title: "Exam Schedules",
      subtitle: "Build exam timetables",
      offlineTab: 1,
      icon: <EventNoteIcon />,
      gradient: "linear-gradient(135deg, #6a1b9a 0%, #ab47bc 100%)",
    },
    {
      title: "Marks Entry",
      subtitle: "Enter marks by schedule",
      offlineTab: 2,
      icon: <AssignmentTurnedInIcon />,
      gradient: "linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)",
    },
    {
      title: "Result Generation",
      subtitle: "Generate and publish results",
      offlineTab: 3,
      icon: <AnalyticsIcon />,
      gradient: "linear-gradient(135deg, #ef6c00 0%, #ffa726 100%)",
    },
  ];

  const offlineStats = useMemo(() => {
    const total = offlineExams.length;
    const published = offlineExams.filter((e) => e.is_published).length;
    const draft = Math.max(0, total - published);
    const editable = offlineExams.filter((e) => e.is_result_editable).length;
    const locked = Math.max(0, total - editable);
    const publishedPct = total ? Math.round((published / total) * 100) : 0;
    return { total, published, draft, editable, locked, publishedPct };
  }, [offlineExams]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Examinations
      </Typography>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          aria-label="Exams tabs"
        >
          <Tab label="Overview" />
          <Tab label="Onsite/Offline Exams" />
          <Tab label="Online Exams" />
        </Tabs>
      </Paper>

      <TabPanel value={tab} index={0}>
        <Paper
          sx={{
            p: 3,
            mb: 3,
            color: "common.white",
            background:
              "linear-gradient(135deg, #0d47a1 0%, #1976d2 35%, #26c6da 100%)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Exam Management Dashboard
              </Typography>
              <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                {currentYear
                  ? `Academic year: ${currentYear.name}`
                  : "Loading academic year…"}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Chip
                  label={`Exams: ${offlineStats.total}`}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                  variant="outlined"
                />
                <Chip
                  label={`Published: ${offlineStats.published}`}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                  variant="outlined"
                />
                <Chip
                  label={`Draft: ${offlineStats.draft}`}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                  variant="outlined"
                />
                <Chip
                  label={`Results locked: ${offlineStats.locked}`}
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                  variant="outlined"
                />
              </Box>
            </Box>

            <Box sx={{ minWidth: 260 }}>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>
                Publishing progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={offlineStats.publishedPct}
                sx={{
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  "& .MuiLinearProgress-bar": { backgroundColor: "#ffffff" },
                }}
              />
              <Typography sx={{ opacity: 0.9, mt: 1 }}>
                {offlineStats.publishedPct}% of exams published
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.18)",
                    boxShadow: "none",
                  }}
                  onClick={() => {
                    setTab(1);
                    setOfflineTab(0);
                  }}
                >
                  Go to Exam Master
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{
                    color: "common.white",
                    borderColor: "rgba(255,255,255,0.6)",
                  }}
                  onClick={() => {
                    setTab(1);
                    setOfflineTab(2);
                  }}
                >
                  Enter Marks
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        <Grid2 container spacing={3}>
          {overviewTiles.map((t) => (
            <Grid2 size={{ xs: 12, sm: 6, md: 3 }} key={t.title}>
              <Paper
                sx={{
                  p: 2.5,
                  height: "100%",
                  cursor: "pointer",
                  color: "common.white",
                  background: t.gradient,
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 140ms ease, box-shadow 140ms ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
                }}
                onClick={() => {
                  setTab(1);
                  setOfflineTab(t.offlineTab);
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {t.title}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                      {t.subtitle}
                    </Typography>
                  </Box>
                  <Box sx={{ opacity: 0.95 }}>{t.icon}</Box>
                </Box>

                <Divider
                  sx={{ my: 2, borderColor: "rgba(255,255,255,0.35)" }}
                />

                {t.offlineTab === 0 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`${offlineStats.total} exams`}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                    <Chip
                      size="small"
                      label={`${offlineStats.published} published`}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                  </Box>
                )}
                {t.offlineTab === 2 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={`Max marks validated`}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                    <Chip
                      size="small"
                      label={`${offlineStats.locked} locked`}
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                  </Box>
                )}
                {t.offlineTab === 3 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label="Generate/Refresh"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                    <Chip
                      size="small"
                      label="Publish & Lock"
                      sx={{
                        backgroundColor: "rgba(255,255,255,0.18)",
                        color: "common.white",
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid2>
          ))}
        </Grid2>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {offlineInitLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!offlineInitLoading && offlineForbidden && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Onsite/Offline exams</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              You do not have permission to view exams management.
            </Typography>
          </Paper>
        )}

        {!offlineInitLoading && !offlineForbidden && currentYear && (
          <Box>
            <Paper>
              <Tabs
                value={offlineTab}
                onChange={(_, v) => setOfflineTab(v)}
                aria-label="Onsite/Offline exams tabs"
              >
                <Tab label="Exam Master" />
                <Tab label="Schedules" />
                <Tab label="Marks Entry" />
                <Tab label="Results" />
              </Tabs>
            </Paper>

            <Box sx={{ pt: 2 }}>
              <TabPanel value={offlineTab} index={0}>
                <OfflineExamMasterTab
                  academicYearName={currentYear.name}
                  academicYearId={currentYear.id}
                  exams={offlineExams}
                  examTypes={offlineExamTypes}
                  loading={offlineExamsLoading}
                  onRefresh={loadOfflineExams}
                  onForbidden={handleOfflineForbidden}
                />
              </TabPanel>
              <TabPanel value={offlineTab} index={1}>
                <OfflineSchedulesTab
                  exams={offlineExams}
                  classes={classes}
                  subjects={subjects}
                  onForbidden={handleOfflineForbidden}
                />
              </TabPanel>
              <TabPanel value={offlineTab} index={2}>
                <OfflineMarksEntryTab
                  exams={offlineExams}
                  classes={classes}
                  subjects={subjects}
                  onForbidden={handleOfflineForbidden}
                />
              </TabPanel>
              <TabPanel value={offlineTab} index={3}>
                <OfflineResultsTab
                  exams={offlineExams}
                  classes={classes}
                  onForbidden={handleOfflineForbidden}
                  onRefreshExams={loadOfflineExams}
                />
              </TabPanel>
            </Box>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        {onlineInitLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!onlineInitLoading && onlineForbidden && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6">Online exams</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              You do not have permission to view online exam management.
            </Typography>
          </Paper>
        )}

        {!onlineInitLoading && !onlineForbidden && onlineInitialized && (
          <Box>
            <Paper>
              <Tabs
                value={onlineTab}
                onChange={(_, v) => setOnlineTab(v)}
                aria-label="Online exams tabs"
              >
                <Tab label="Question Bank" />
                <Tab label="Configs" />
                <Tab label="Attempts" />
              </Tabs>
            </Paper>

            <TabPanel value={onlineTab} index={0}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="h6">Categories</Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setCategoryDialogOpen(true)}
                      >
                        Add
                      </Button>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {categoriesLoading ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 2,
                        }}
                      >
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {categories.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      onClick={async () => {
                                        try {
                                          await deleteQuestionBankCategory(
                                            c.id,
                                          );
                                        } catch (err: unknown) {
                                          const anyErr = err as {
                                            response?: { status?: number };
                                          };
                                          if (anyErr.response?.status === 403) {
                                            handleOnlineForbidden();
                                          }
                                          return;
                                        }
                                        await loadCategories();
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                            {categories.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={2}>
                                  No categories found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 8 }}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography variant="h6">Questions</Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={openCreateQuestion}
                      >
                        Add
                      </Button>
                    </Box>

                    <Box
                      sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}
                    >
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Category</InputLabel>
                        <Select
                          label="Category"
                          value={questionFilters.category_id}
                          onChange={(e) =>
                            setQuestionFilters((p) => ({
                              ...p,
                              category_id: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="">All</MenuItem>
                          {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Subject</InputLabel>
                        <Select
                          label="Subject"
                          value={questionFilters.subject_id}
                          onChange={(e) =>
                            setQuestionFilters((p) => ({
                              ...p,
                              subject_id: e.target.value,
                            }))
                          }
                        >
                          <MenuItem value="">All</MenuItem>
                          {subjects.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          label="Status"
                          value={questionFilters.active}
                          onChange={(e) =>
                            setQuestionFilters((p) => ({
                              ...p,
                              active: e.target.value as
                                | "all"
                                | "active"
                                | "inactive",
                            }))
                          }
                        >
                          <MenuItem value="all">All</MenuItem>
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                      </FormControl>

                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => void loadQuestions().catch(() => {})}
                      >
                        Refresh
                      </Button>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {questionsLoading ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 3,
                        }}
                      >
                        <CircularProgress size={28} />
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Prompt</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Category</TableCell>
                              <TableCell>Subject</TableCell>
                              <TableCell>Points</TableCell>
                              <TableCell>Active</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {questions.map((q) => (
                              <TableRow key={q.id}>
                                <TableCell sx={{ maxWidth: 420 }}>
                                  {questionPreview(q.prompt)}
                                </TableCell>
                                <TableCell>{q.question_type}</TableCell>
                                <TableCell>
                                  {q.category_id
                                    ? (categoryById.get(q.category_id)?.name ??
                                      "-")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {q.subject_id
                                    ? (subjectById.get(q.subject_id)?.name ??
                                      "-")
                                    : "-"}
                                </TableCell>
                                <TableCell>{q.points}</TableCell>
                                <TableCell>
                                  {q.is_active ? "Yes" : "No"}
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Edit">
                                    <IconButton
                                      size="small"
                                      onClick={() => openEditQuestion(q)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      onClick={async () => {
                                        try {
                                          await deleteQuestionBankQuestion(
                                            q.id,
                                          );
                                        } catch (err: unknown) {
                                          const anyErr = err as {
                                            response?: { status?: number };
                                          };
                                          if (anyErr.response?.status === 403) {
                                            handleOnlineForbidden();
                                          }
                                          return;
                                        }
                                        await loadQuestions();
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            ))}
                            {questions.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7}>
                                  No questions found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid2>
              </Grid2>
            </TabPanel>

            <TabPanel value={onlineTab} index={1}>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12 }}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography variant="h6">Online Exam Configs</Typography>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={openCreateConfig}
                      >
                        Add
                      </Button>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {configsLoading ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 3,
                        }}
                      >
                        <CircularProgress size={28} />
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Schedule</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Attempts</TableCell>
                              <TableCell>Window</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {configs.map((cfg) => {
                              const sched = schedules.find(
                                (s) => s.id === cfg.exam_schedule_id,
                              );
                              const label = sched
                                ? scheduleLabel(sched)
                                : cfg.exam_schedule_id;
                              const window =
                                cfg.starts_at || cfg.ends_at
                                  ? `${cfg.starts_at ?? "-"} → ${cfg.ends_at ?? "-"}`
                                  : "-";
                              return (
                                <TableRow
                                  key={cfg.id}
                                  hover
                                  selected={selectedConfigId === cfg.id}
                                  onClick={() => {
                                    setSelectedConfigId(cfg.id);
                                    void loadConfigQuestions(cfg.id);
                                  }}
                                  sx={{ cursor: "pointer" }}
                                >
                                  <TableCell>{label}</TableCell>
                                  <TableCell>
                                    {cfg.duration_minutes} min
                                  </TableCell>
                                  <TableCell>{cfg.attempt_limit}</TableCell>
                                  <TableCell sx={{ maxWidth: 360 }}>
                                    {window}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Tooltip title="Edit">
                                      <IconButton
                                        size="small"
                                        onClick={() => openEditConfig(cfg)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                      <IconButton
                                        size="small"
                                        onClick={async () => {
                                          try {
                                            await deleteOnlineExamConfig(
                                              cfg.id,
                                            );
                                          } catch (err: unknown) {
                                            const anyErr = err as {
                                              response?: { status?: number };
                                            };
                                            if (
                                              anyErr.response?.status === 403
                                            ) {
                                              handleOnlineForbidden();
                                            }
                                            return;
                                          }
                                          if (selectedConfigId === cfg.id) {
                                            setSelectedConfigId("");
                                            setConfigQuestions([]);
                                          }
                                          await loadConfigs();
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {configs.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  No online exam configs found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid2>

                <Grid2 size={{ xs: 12 }}>
                  <Paper sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography variant="h6">Config Questions</Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            if (!selectedConfigId) return;
                            void loadConfigQuestions(selectedConfigId);
                          }}
                          disabled={!selectedConfigId}
                        >
                          Refresh
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => void openAddQuestions()}
                          disabled={!selectedConfigId}
                        >
                          Add Questions
                        </Button>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />

                    {!selectedConfigId && (
                      <Typography color="text.secondary">
                        Select a config above to view and add questions.
                      </Typography>
                    )}

                    {selectedConfigId && configQuestionsLoading && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          py: 3,
                        }}
                      >
                        <CircularProgress size={28} />
                      </Box>
                    )}

                    {selectedConfigId && !configQuestionsLoading && (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Order</TableCell>
                              <TableCell>Question</TableCell>
                              <TableCell>Points</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {configQuestions.map((row) => {
                              const q = questionById.get(row.question_id);
                              return (
                                <TableRow key={row.id}>
                                  <TableCell>{row.order_index}</TableCell>
                                  <TableCell sx={{ maxWidth: 760 }}>
                                    {q
                                      ? questionPreview(q.prompt)
                                      : row.question_id}
                                  </TableCell>
                                  <TableCell>{row.points ?? "-"}</TableCell>
                                </TableRow>
                              );
                            })}
                            {configQuestions.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={3}>
                                  No questions added yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Paper>
                </Grid2>
              </Grid2>
            </TabPanel>

            <TabPanel value={onlineTab} index={2}>
              <Paper sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                  }}
                >
                  <Typography variant="h6">Attempts</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => void loadAttempts().catch(() => {})}
                  >
                    Refresh
                  </Button>
                </Box>
                <Divider sx={{ my: 2 }} />

                {attemptsLoading ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 3 }}
                  >
                    <CircularProgress size={28} />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Started</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Student</TableCell>
                          <TableCell>Config</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attempts.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.started_at}</TableCell>
                            <TableCell>{a.status}</TableCell>
                            <TableCell>
                              {a.score != null && a.max_score != null
                                ? `${a.score}/${a.max_score} (${(a.percentage ?? 0).toFixed(1)}%)`
                                : "-"}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 300 }}>
                              {a.student_id}
                            </TableCell>
                            <TableCell sx={{ maxWidth: 300 }}>
                              {a.config_id}
                            </TableCell>
                          </TableRow>
                        ))}
                        {attempts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5}>
                              No attempts found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </TabPanel>
          </Box>
        )}
      </TabPanel>

      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField
            label="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitCategory()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={questionDialogOpen}
        onClose={() => setQuestionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingQuestion ? "Edit Question" : "Add Question"}
        </DialogTitle>
        <DialogContent>
          <Grid2 container spacing={2} sx={{ mt: 0 }}>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={questionForm.category_id}
                  onChange={(e) =>
                    setQuestionForm((p) => ({
                      ...p,
                      category_id: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Subject</InputLabel>
                <Select
                  label="Subject"
                  value={questionForm.subject_id}
                  onChange={(e) =>
                    setQuestionForm((p) => ({
                      ...p,
                      subject_id: e.target.value,
                    }))
                  }
                >
                  <MenuItem value="">None</MenuItem>
                  {subjects.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Question type"
                fullWidth
                margin="normal"
                value={questionForm.question_type}
                onChange={(e) =>
                  setQuestionForm((p) => ({
                    ...p,
                    question_type: e.target.value,
                  }))
                }
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <TextField
                label="Points"
                type="number"
                fullWidth
                margin="normal"
                value={questionForm.points}
                onChange={(e) =>
                  setQuestionForm((p) => ({
                    ...p,
                    points: Number(e.target.value),
                  }))
                }
                inputProps={{ min: 1, max: 500 }}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 3 }}>
              <FormControlLabel
                sx={{ mt: 2 }}
                control={
                  <Switch
                    checked={questionForm.is_active}
                    onChange={(e) =>
                      setQuestionForm((p) => ({
                        ...p,
                        is_active: e.target.checked,
                      }))
                    }
                  />
                }
                label="Active"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Difficulty"
                fullWidth
                margin="normal"
                value={questionForm.difficulty}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, difficulty: e.target.value }))
                }
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Tags"
                fullWidth
                margin="normal"
                value={questionForm.tags}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, tags: e.target.value }))
                }
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <TextField
                label="Prompt"
                fullWidth
                margin="normal"
                value={questionForm.prompt}
                onChange={(e) =>
                  setQuestionForm((p) => ({ ...p, prompt: e.target.value }))
                }
                multiline
                minRows={4}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Options (JSON object)"
                fullWidth
                margin="normal"
                value={questionForm.options_json}
                onChange={(e) =>
                  setQuestionForm((p) => ({
                    ...p,
                    options_json: e.target.value,
                  }))
                }
                multiline
                minRows={6}
                placeholder={`{\n  "choices": [\n    {"id": "A", "text": "Option A"}\n  ]\n}`}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}>
              <TextField
                label="Correct answer (JSON object)"
                fullWidth
                margin="normal"
                value={questionForm.correct_answer_json}
                onChange={(e) =>
                  setQuestionForm((p) => ({
                    ...p,
                    correct_answer_json: e.target.value,
                  }))
                }
                multiline
                minRows={6}
                placeholder={`{\n  "choice_id": "A"\n}`}
              />
            </Grid2>
          </Grid2>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setQuestionDialogOpen(false);
              setEditingQuestion(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void submitQuestion()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingConfig ? "Edit Config" : "Add Config"}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Exam schedule</InputLabel>
            <Select
              label="Exam schedule"
              value={configForm.exam_schedule_id}
              onChange={(e) =>
                setConfigForm((p) => ({
                  ...p,
                  exam_schedule_id: e.target.value,
                }))
              }
            >
              <MenuItem value="">Select...</MenuItem>
              {schedules.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {scheduleLabel(s)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Duration (minutes)"
                type="number"
                fullWidth
                margin="normal"
                value={configForm.duration_minutes}
                onChange={(e) =>
                  setConfigForm((p) => ({
                    ...p,
                    duration_minutes: Number(e.target.value),
                  }))
                }
                inputProps={{ min: 5, max: 360 }}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Attempt limit"
                type="number"
                fullWidth
                margin="normal"
                value={configForm.attempt_limit}
                onChange={(e) =>
                  setConfigForm((p) => ({
                    ...p,
                    attempt_limit: Number(e.target.value),
                  }))
                }
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                sx={{ mt: 2 }}
                control={
                  <Switch
                    checked={configForm.proctoring_enabled}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        proctoring_enabled: e.target.checked,
                      }))
                    }
                  />
                }
                label="Proctoring"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={configForm.shuffle_questions}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        shuffle_questions: e.target.checked,
                      }))
                    }
                  />
                }
                label="Shuffle questions"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={configForm.shuffle_options}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        shuffle_options: e.target.checked,
                      }))
                    }
                  />
                }
                label="Shuffle options"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 4 }}>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={configForm.allow_backtrack}
                    onChange={(e) =>
                      setConfigForm((p) => ({
                        ...p,
                        allow_backtrack: e.target.checked,
                      }))
                    }
                  />
                }
                label="Allow backtrack"
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Starts at"
                type="datetime-local"
                fullWidth
                margin="normal"
                value={configForm.starts_at_local}
                onChange={(e) =>
                  setConfigForm((p) => ({
                    ...p,
                    starts_at_local: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid2>
            <Grid2 size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Ends at"
                type="datetime-local"
                fullWidth
                margin="normal"
                value={configForm.ends_at_local}
                onChange={(e) =>
                  setConfigForm((p) => ({
                    ...p,
                    ends_at_local: e.target.value,
                  }))
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid2>
            <Grid2 size={{ xs: 12 }}>
              <TextField
                label="Instructions"
                fullWidth
                margin="normal"
                value={configForm.instructions}
                onChange={(e) =>
                  setConfigForm((p) => ({ ...p, instructions: e.target.value }))
                }
                multiline
                minRows={3}
              />
            </Grid2>
          </Grid2>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfigDialogOpen(false);
              setEditingConfig(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void submitConfig()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addQuestionsDialogOpen}
        onClose={() => setAddQuestionsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Add Questions</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={addQuestionsFilters.category_id}
                onChange={(e) =>
                  setAddQuestionsFilters((p) => ({
                    ...p,
                    category_id: e.target.value,
                  }))
                }
              >
                <MenuItem value="">All</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Subject</InputLabel>
              <Select
                label="Subject"
                value={addQuestionsFilters.subject_id}
                onChange={(e) =>
                  setAddQuestionsFilters((p) => ({
                    ...p,
                    subject_id: e.target.value,
                  }))
                }
              >
                <MenuItem value="">All</MenuItem>
                {subjects.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              sx={{ ml: 1 }}
              control={
                <Switch
                  checked={addQuestionsFilters.activeOnly}
                  onChange={(e) =>
                    setAddQuestionsFilters((p) => ({
                      ...p,
                      activeOnly: e.target.checked,
                    }))
                  }
                />
              }
              label="Active only"
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => void loadAvailableQuestions().catch(() => {})}
            >
              Refresh
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {availableQuestionsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Select</TableCell>
                    <TableCell>Prompt</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableQuestions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <Switch
                          checked={Boolean(selectedQuestionIds[q.id])}
                          onChange={(e) =>
                            setSelectedQuestionIds((p) => ({
                              ...p,
                              [q.id]: e.target.checked,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 760 }}>
                        {questionPreview(q.prompt)}
                      </TableCell>
                      <TableCell>{q.question_type}</TableCell>
                      <TableCell>{q.points}</TableCell>
                    </TableRow>
                  ))}
                  {availableQuestions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>No questions found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddQuestionsDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void submitAddQuestions()}>
            Add selected
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
