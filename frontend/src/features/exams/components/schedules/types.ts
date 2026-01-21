import type { Exam, ExamSchedule } from "../../../../api/exams";
import type { SchoolClass, Subject } from "../../../../api/academic";

export type OfflineSchedulesTabProps = {
  exams: Exam[];
  classes: SchoolClass[];
  subjects: Subject[];
  onForbidden: () => void;
};

export type ScheduleForm = {
  exam_id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  max_marks: string;
};

export type BulkRow = {
  id: string;
  class_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  max_marks: string;
};

export type Lookups = {
  examById: Map<string, Exam>;
  classById: Map<string, SchoolClass>;
  subjectById: Map<string, Subject>;
};

export type ScheduleRow = ExamSchedule;
