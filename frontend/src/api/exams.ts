import { api } from "./client";

export type Exam = {
  id: string;
  academic_year_id: string;
  name: string;
  exam_code: string | null;
  exam_type_code: string | null;
  exam_type: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  weight_percentage: number | null;
  included_in_final_result: boolean;
  best_of_count: number | null;
  aggregation_method: string | null;
  counts_for_gpa: boolean;
  result_entry_deadline: string | null;
  result_publish_date: string | null;
  locked_at?: string | null;
  is_result_editable: boolean;
  instructions: string | null;
  is_published: boolean;
};

export type ExamType = {
  code: string;
  label: string;
  frequency_hint: string | null;
  weight_min: number | null;
  weight_max: number | null;
  is_active: boolean;
};

export type ExamSchedule = {
  id: string;
  exam_id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  max_marks: number;
};

export async function getExams(params?: {
  academic_year_id?: string;
  exam_type?: string;
  exam_type_code?: string;
}): Promise<Exam[]> {
  const resp = await api.get("/exams", { params });
  return resp.data as Exam[];
}

export async function getExamTypes(): Promise<ExamType[]> {
  const resp = await api.get("/exams/types");
  return resp.data as ExamType[];
}

export async function createExam(payload: {
  academic_year_id: string;
  name: string;
  exam_code?: string | null;
  exam_type_code?: string | null;
  exam_type?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  weight_percentage?: number | null;
  included_in_final_result?: boolean | null;
  best_of_count?: number | null;
  aggregation_method?: string | null;
  counts_for_gpa?: boolean | null;
  result_entry_deadline?: string | null;
  result_publish_date?: string | null;
  is_result_editable?: boolean | null;
  instructions?: string | null;
}): Promise<Exam> {
  const resp = await api.post("/exams", payload);
  return resp.data as Exam;
}

export async function updateExam(
  examId: string,
  payload: {
    name?: string;
    exam_code?: string | null;
    exam_type_code?: string | null;
    exam_type?: string | null;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    weight_percentage?: number | null;
    included_in_final_result?: boolean | null;
    best_of_count?: number | null;
    aggregation_method?: string | null;
    counts_for_gpa?: boolean | null;
    result_entry_deadline?: string | null;
    result_publish_date?: string | null;
    is_result_editable?: boolean | null;
    instructions?: string | null;
  },
): Promise<Exam> {
  const resp = await api.put(`/exams/${examId}`, payload);
  return resp.data as Exam;
}

export async function deleteExam(examId: string): Promise<void> {
  await api.delete(`/exams/${examId}`);
}

export async function publishExam(examId: string): Promise<void> {
  await api.post(`/exams/${examId}/publish`);
}

export async function getExamSchedules(params?: {
  exam_id?: string;
  class_id?: string;
}): Promise<ExamSchedule[]> {
  const resp = await api.get("/exam-schedules", { params });
  return resp.data as ExamSchedule[];
}

export async function createExamSchedule(payload: {
  exam_id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time?: string | null;
  end_time?: string | null;
  room?: string | null;
  max_marks: number;
}): Promise<ExamSchedule> {
  const resp = await api.post("/exam-schedules", payload);
  return resp.data as ExamSchedule;
}

export async function updateExamSchedule(
  scheduleId: string,
  payload: {
    exam_date?: string;
    start_time?: string | null;
    end_time?: string | null;
    room?: string | null;
    max_marks?: number | null;
  },
): Promise<ExamSchedule> {
  const resp = await api.put(`/exam-schedules/${scheduleId}`, payload);
  return resp.data as ExamSchedule;
}

export async function deleteExamSchedule(scheduleId: string): Promise<void> {
  await api.delete(`/exam-schedules/${scheduleId}`);
}

export async function bulkCreateExamSchedules(payload: {
  items: Array<{
    exam_id: string;
    class_id: string;
    subject_id: string;
    exam_date: string;
    start_time?: string | null;
    end_time?: string | null;
    room?: string | null;
    max_marks?: number;
  }>;
}): Promise<{ created: number }> {
  const resp = await api.post("/exam-schedules/bulk-create", payload);
  return resp.data as { created: number };
}

export type Mark = {
  id: string;
  exam_schedule_id: string;
  student_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks: string | null;
};

export async function getMarks(params?: {
  exam_schedule_id?: string;
  student_id?: string;
  class_id?: string;
}): Promise<Mark[]> {
  const resp = await api.get("/marks", { params });
  return resp.data as Mark[];
}

export async function enterMarks(payload: {
  exam_schedule_id: string;
  items: Array<{
    student_id: string;
    marks_obtained: number | null;
    is_absent: boolean;
    remarks?: string | null;
  }>;
}): Promise<Mark[]> {
  const resp = await api.post("/marks/enter", payload);
  return resp.data as Mark[];
}

export type Result = {
  id: string;
  exam_id: string;
  student_id: string;
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  grade_id: string | null;
};

export async function getResults(params: {
  exam_id: string;
  class_id?: string;
}): Promise<Result[]> {
  const resp = await api.get("/results", { params });
  return resp.data as Result[];
}

export type QuestionBankCategory = {
  id: string;
  school_id: string;
  name: string;
};

export type QuestionBankQuestion = {
  id: string;
  school_id: string;
  category_id: string | null;
  subject_id: string | null;
  question_type: string;
  prompt: string;
  options: Record<string, unknown> | null;
  points: number;
  difficulty: string | null;
  tags: string | null;
  is_active: boolean;
};

export async function getQuestionBankCategories(): Promise<
  QuestionBankCategory[]
> {
  const resp = await api.get("/online-exams/question-bank/categories");
  return resp.data as QuestionBankCategory[];
}

export async function createQuestionBankCategory(payload: {
  name: string;
}): Promise<QuestionBankCategory> {
  const resp = await api.post(
    "/online-exams/question-bank/categories",
    payload,
  );
  return resp.data as QuestionBankCategory;
}

export async function deleteQuestionBankCategory(
  categoryId: string,
): Promise<void> {
  await api.delete(`/online-exams/question-bank/categories/${categoryId}`);
}

export async function getQuestionBankQuestions(params?: {
  category_id?: string;
  subject_id?: string;
  is_active?: boolean;
}): Promise<QuestionBankQuestion[]> {
  const resp = await api.get("/online-exams/question-bank/questions", {
    params,
  });
  return resp.data as QuestionBankQuestion[];
}

export async function createQuestionBankQuestion(payload: {
  category_id?: string | null;
  subject_id?: string | null;
  question_type: string;
  prompt: string;
  options?: Record<string, unknown> | null;
  correct_answer?: Record<string, unknown> | null;
  points: number;
  difficulty?: string | null;
  tags?: string | null;
  is_active?: boolean;
}): Promise<QuestionBankQuestion> {
  const resp = await api.post("/online-exams/question-bank/questions", payload);
  return resp.data as QuestionBankQuestion;
}

export async function updateQuestionBankQuestion(
  questionId: string,
  payload: {
    category_id?: string | null;
    subject_id?: string | null;
    question_type?: string | null;
    prompt?: string | null;
    options?: Record<string, unknown> | null;
    correct_answer?: Record<string, unknown> | null;
    points?: number | null;
    difficulty?: string | null;
    tags?: string | null;
    is_active?: boolean | null;
  },
): Promise<QuestionBankQuestion> {
  const resp = await api.patch(
    `/online-exams/question-bank/questions/${questionId}`,
    payload,
  );
  return resp.data as QuestionBankQuestion;
}

export async function deleteQuestionBankQuestion(
  questionId: string,
): Promise<void> {
  await api.delete(`/online-exams/question-bank/questions/${questionId}`);
}

export type OnlineExamConfig = {
  id: string;
  school_id: string;
  exam_schedule_id: string;
  duration_minutes: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  allow_backtrack: boolean;
  proctoring_enabled: boolean;
  attempt_limit: number;
  starts_at: string | null;
  ends_at: string | null;
  instructions: string | null;
};

export type OnlineExamConfigQuestion = {
  id: string;
  config_id: string;
  question_id: string;
  order_index: number;
  points: number | null;
};

export async function getOnlineExamConfigs(params?: {
  exam_schedule_id?: string;
}): Promise<OnlineExamConfig[]> {
  const resp = await api.get("/online-exams/configs", { params });
  return resp.data as OnlineExamConfig[];
}

export async function createOnlineExamConfig(payload: {
  exam_schedule_id: string;
  duration_minutes: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  allow_backtrack?: boolean;
  proctoring_enabled?: boolean;
  attempt_limit?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  instructions?: string | null;
}): Promise<OnlineExamConfig> {
  const resp = await api.post("/online-exams/configs", payload);
  return resp.data as OnlineExamConfig;
}

export async function updateOnlineExamConfig(
  configId: string,
  payload: {
    duration_minutes?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    allow_backtrack?: boolean;
    proctoring_enabled?: boolean;
    attempt_limit?: number;
    starts_at?: string | null;
    ends_at?: string | null;
    instructions?: string | null;
  },
): Promise<OnlineExamConfig> {
  const resp = await api.patch(`/online-exams/configs/${configId}`, payload);
  return resp.data as OnlineExamConfig;
}

export async function deleteOnlineExamConfig(configId: string): Promise<void> {
  await api.delete(`/online-exams/configs/${configId}`);
}

export async function getOnlineExamConfigQuestions(
  configId: string,
): Promise<OnlineExamConfigQuestion[]> {
  const resp = await api.get(`/online-exams/configs/${configId}/questions`);
  return resp.data as OnlineExamConfigQuestion[];
}

export async function bulkAddOnlineExamConfigQuestions(
  configId: string,
  payload: {
    items: Array<{
      question_id: string;
      order_index?: number | null;
      points?: number | null;
    }>;
  },
): Promise<{ created: number }> {
  const resp = await api.post(
    `/online-exams/configs/${configId}/questions`,
    payload,
  );
  return resp.data as { created: number };
}

export type OnlineExamAttempt = {
  id: string;
  config_id: string;
  student_id: string;
  attempt_no: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
};

export async function getOnlineExamAttempts(params?: {
  config_id?: string;
  student_id?: string;
}): Promise<OnlineExamAttempt[]> {
  const resp = await api.get("/online-exams/attempts", { params });
  return resp.data as OnlineExamAttempt[];
}
