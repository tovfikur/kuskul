import { api } from "./client";

export type AcademicYear = {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const resp = await api.get("/academic-years");
  return resp.data;
}

export async function getCurrentAcademicYear(): Promise<AcademicYear> {
  const resp = await api.get("/academic-years/current");
  return resp.data;
}

export async function createAcademicYear(data: {
  name: string;
  start_date: string;
  end_date: string;
}): Promise<AcademicYear> {
  const resp = await api.post("/academic-years", data);
  return resp.data;
}

export async function setCurrentAcademicYear(
  id: string
): Promise<AcademicYear> {
  const resp = await api.patch(`/academic-years/${id}/set-current`);
  return resp.data;
}

export type Term = {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  weightage: number;
  is_active: boolean;
};

export async function getTerms(academicYearId?: string): Promise<Term[]> {
  const resp = await api.get("/terms", {
    params: academicYearId ? { academic_year_id: academicYearId } : undefined,
  });
  return resp.data;
}

export async function createTerm(data: {
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  weightage?: number;
  is_active?: boolean;
}): Promise<Term> {
  const resp = await api.post("/terms", data);
  return resp.data;
}

export type Stream = {
  id: string;
  school_id: string;
  name: string;
  is_active: boolean;
};

export async function getStreams(): Promise<Stream[]> {
  const resp = await api.get("/streams");
  return resp.data;
}

export async function createStream(data: {
  name: string;
  is_active?: boolean;
}): Promise<Stream> {
  const resp = await api.post("/streams", data);
  return resp.data;
}

export type SchoolClass = {
  id: string;
  school_id: string;
  name: string;
  numeric_value: number | null;
  is_active: boolean;
};

export async function getClasses(): Promise<SchoolClass[]> {
  const resp = await api.get("/classes");
  return resp.data;
}

export async function createClass(data: {
  name: string;
  numeric_value?: number | null;
  is_active?: boolean;
}): Promise<SchoolClass> {
  const resp = await api.post("/classes", data);
  return resp.data;
}

export type Section = {
  id: string;
  class_id: string;
  name: string;
  capacity: number;
  stream_id: string | null;
  is_active: boolean;
  room_number: string | null;
};

export async function getSections(classId: string): Promise<Section[]> {
  const resp = await api.get(`/classes/${classId}/sections`);
  return resp.data;
}

export async function createSection(data: {
  class_id: string;
  name: string;
  capacity?: number;
  stream_id?: string | null;
  is_active?: boolean;
  room_number?: string | null;
}): Promise<Section> {
  const resp = await api.post("/sections", data);
  return resp.data;
}

export type SubjectGroup = {
  id: string;
  school_id: string;
  name: string;
  class_id: string | null;
  stream_id: string | null;
  is_optional: boolean;
};

export async function getSubjectGroups(params?: {
  class_id?: string;
  stream_id?: string;
}): Promise<SubjectGroup[]> {
  const resp = await api.get("/subject-groups", { params });
  return resp.data;
}

export async function createSubjectGroup(data: {
  name: string;
  class_id?: string | null;
  stream_id?: string | null;
  is_optional?: boolean;
}): Promise<SubjectGroup> {
  const resp = await api.post("/subject-groups", data);
  return resp.data;
}

export type Subject = {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  subject_type: string;
  credits: number | null;
  max_marks: number | null;
  group_id: string | null;
  stream_id: string | null;
  is_active: boolean;
};

export async function getSubjects(): Promise<Subject[]> {
  const resp = await api.get("/subjects");
  return resp.data;
}

export async function createSubject(data: {
  name: string;
  code?: string | null;
  subject_type?: string;
  credits?: number | null;
  max_marks?: number | null;
  group_id?: string | null;
  stream_id?: string | null;
  is_active?: boolean;
}): Promise<Subject> {
  const resp = await api.post("/subjects", data);
  return resp.data;
}

export async function assignSubjectToClass(
  subjectId: string,
  classId: string
): Promise<void> {
  await api.post(`/subjects/${subjectId}/assign-to-class`, {
    class_id: classId,
  });
}

export type TimeSlot = {
  id: string;
  school_id: string;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: string;
  shift: string;
  is_active: boolean;
};

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const resp = await api.get("/time-slots");
  return resp.data;
}

export async function createTimeSlot(data: {
  name: string;
  start_time: string;
  end_time: string;
  slot_type?: string;
  shift?: string;
  is_active?: boolean;
}): Promise<TimeSlot> {
  const resp = await api.post("/time-slots", data);
  return resp.data;
}

export type TimetableEntry = {
  id: string;
  academic_year_id: string;
  section_id: string;
  staff_id: string | null;
  subject_id: string | null;
  time_slot_id: string;
  day_of_week: number;
  room: string | null;
};

export async function getTimetable(params?: {
  section_id?: string;
  staff_id?: string;
  day_of_week?: number;
}): Promise<TimetableEntry[]> {
  const resp = await api.get("/timetable", { params });
  return resp.data;
}

export async function createTimetableEntry(data: {
  academic_year_id: string;
  section_id: string;
  time_slot_id: string;
  day_of_week: number;
  subject_id?: string | null;
  staff_id?: string | null;
  room?: string | null;
}): Promise<TimetableEntry> {
  const resp = await api.post("/timetable", data);
  return resp.data;
}

export type TeacherAssignment = {
  id: string;
  academic_year_id: string;
  staff_id: string;
  section_id: string;
  subject_id: string;
  is_active: boolean;
};

export async function getTeacherAssignments(params?: {
  academic_year_id?: string;
  staff_id?: string;
  section_id?: string;
  subject_id?: string;
}): Promise<TeacherAssignment[]> {
  const resp = await api.get("/teacher-assignments", { params });
  return resp.data;
}

export async function createTeacherAssignment(data: {
  academic_year_id: string;
  staff_id: string;
  section_id: string;
  subject_id: string;
  is_active?: boolean;
}): Promise<TeacherAssignment> {
  const resp = await api.post("/teacher-assignments", data);
  return resp.data;
}

export type Grade = {
  id: string;
  school_id: string;
  name: string;
  min_percentage: number;
  max_percentage: number;
};

export async function getGrades(): Promise<Grade[]> {
  const resp = await api.get("/grades");
  return resp.data;
}

export async function createGrade(data: {
  name: string;
  min_percentage: number;
  max_percentage: number;
}): Promise<Grade> {
  const resp = await api.post("/grades", data);
  return resp.data;
}

export type CurriculumUnit = {
  id: string;
  academic_year_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  order_index: number;
};

export async function getCurriculum(params?: {
  academic_year_id?: string;
  subject_id?: string;
}): Promise<CurriculumUnit[]> {
  const resp = await api.get("/curriculum", { params });
  return resp.data;
}

export async function createCurriculumUnit(data: {
  academic_year_id: string;
  subject_id: string;
  title: string;
  description?: string | null;
  order_index?: number;
}): Promise<CurriculumUnit> {
  const resp = await api.post("/curriculum", data);
  return resp.data;
}

export type AcademicCalendarSettings = {
  id: string;
  academic_year_id: string;
  working_days_mask: number;
  shift: string;
};

export async function getAcademicCalendarSettings(
  academicYearId: string
): Promise<AcademicCalendarSettings> {
  const resp = await api.get(`/academic-calendar/${academicYearId}`);
  return resp.data;
}

export async function updateAcademicCalendarSettings(
  academicYearId: string,
  data: { working_days_mask: number; shift: string }
): Promise<AcademicCalendarSettings> {
  const resp = await api.put(`/academic-calendar/${academicYearId}`, data);
  return resp.data;
}
