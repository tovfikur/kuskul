import { api } from "./client";

export type Student = {
  id: string;
  school_id?: string;
  first_name: string;
  last_name?: string | null;
  admission_no?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  status: string;
  photo_url?: string | null;
  email?: string;
  phone?: string;
};

export interface Staff {
  id: string;
  school_id?: string;
  full_name?: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  job_title?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export async function getStudents(
  params?: {
    page?: number;
    limit?: number;
    class_id?: string;
    section_id?: string;
    search?: string;
    status?: string;
    gender?: string;
  }
): Promise<{ items: Student[]; total: number; page: number; limit: number }> {
  const resp = await api.get("/students", {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 100,
      class_id: params?.class_id || undefined,
      section_id: params?.section_id || undefined,
      search: params?.search || undefined,
      status: params?.status || undefined,
      gender: params?.gender || undefined,
    },
  });
  return resp.data;
}

export async function getStudent(studentId: string): Promise<Student> {
  const resp = await api.get(`/students/${studentId}`);
  return resp.data;
}

export async function createStudent(payload: {
  first_name: string;
  last_name?: string | null;
  admission_no?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  status?: string;
}): Promise<Student> {
  const resp = await api.post("/students", payload);
  return resp.data;
}

export async function updateStudent(
  studentId: string,
  payload: {
    first_name?: string;
    last_name?: string | null;
    admission_no?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    status?: string;
    photo_url?: string | null;
  }
): Promise<Student> {
  const resp = await api.put(`/students/${studentId}`, payload);
  return resp.data;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await api.delete(`/students/${studentId}`);
}

export type StudentAttendanceRecord = {
  id: string;
  attendance_date: string;
  student_id: string;
  class_id: string | null;
  section_id: string | null;
  status: string;
};

export async function getStudentAttendance(
  studentId: string,
  params?: { start_date?: string; end_date?: string }
): Promise<StudentAttendanceRecord[]> {
  const resp = await api.get(`/students/${studentId}/attendance`, { params });
  return resp.data;
}

export async function getStudentAttendanceSummary(
  studentId: string,
  params?: { start_date?: string; end_date?: string }
): Promise<Record<string, number>> {
  const resp = await api.get(`/students/${studentId}/attendance/summary`, {
    params,
  });
  return resp.data;
}

export type FeeDue = {
  id: string;
  student_id: string;
  academic_year_id: string;
  total_fee: number;
  discount_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  last_calculated_date: string;
};

export type FeePayment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  is_refund: boolean;
};

export async function getStudentFeeDues(studentId: string): Promise<FeeDue[]> {
  const resp = await api.get(`/fee-dues/student/${studentId}`);
  return resp.data;
}

export async function getStudentFeePayments(
  studentId: string
): Promise<FeePayment[]> {
  const resp = await api.get(`/fee-payments/student/${studentId}`);
  return resp.data;
}

export type StudentTimetableEntry = {
  id: string;
  day_of_week: number;
  time_slot_id: string;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  staff_id: string | null;
  room: string | null;
};

export async function getStudentTimetable(
  studentId: string
): Promise<StudentTimetableEntry[]> {
  const resp = await api.get(`/students/${studentId}/timetable`);
  return resp.data;
}

export async function bulkImportStudentsCsv(file: File): Promise<{
  created: number;
}> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await api.post("/students/bulk-import", formData);
  return resp.data;
}

export async function exportStudentsCsv(): Promise<Blob> {
  const resp = await api.get("/students/export", { responseType: "blob" });
  return resp.data as Blob;
}

export async function downloadStudentIdCard(studentId: string): Promise<Blob> {
  const resp = await api.get(`/students/${studentId}/id-card`, {
    responseType: "blob",
  });
  return resp.data as Blob;
}

export async function getStaff(
  page = 1,
  limit = 100
): Promise<{ items: Staff[]; total: number }> {
  const resp = await api.get("/staff", {
    params: { page, limit },
  });
  return resp.data;
}

export async function getUsers(
  page = 1,
  limit = 100
): Promise<{ items: User[]; total: number }> {
  const resp = await api.get("/users", {
    params: { page, limit },
  });
  return resp.data;
}
