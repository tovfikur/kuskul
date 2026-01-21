import type { Exam, ExamType } from "../../../../api/exams";

export type ExamTypeOption = {
  value: string;
  label: string;
};

export type ExamForm = {
  name: string;
  exam_code: string;
  exam_type: string;
  exam_type_custom: string;
  status: string;
  start_date: string;
  end_date: string;
  weight_percentage: string;
  included_in_final_result: boolean;
  best_of_count: string;
  aggregation_method: string;
  counts_for_gpa: boolean;
  result_entry_deadline: string;
  result_publish_date: string;
  is_result_editable: boolean;
  instructions: string;
};

export type OfflineExamMasterTabProps = {
  academicYearName: string;
  academicYearId: string;
  exams: Exam[];
  examTypes: ExamType[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onForbidden: () => void;
};
