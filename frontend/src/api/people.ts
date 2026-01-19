import { api } from "./client";

export type Student = {
  id: string;
  school_id?: string;
  first_name: string;
  last_name?: string | null;
  admission_no?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  full_name_bc?: string | null;
  place_of_birth?: string | null;
  nationality?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  admission_date?: string | null;
  admission_status?: string;
  medium?: string | null;
  shift?: string | null;
  previous_school_name?: string | null;
  previous_class?: string | null;
  transfer_certificate_no?: string | null;
  present_address?: string | null;
  permanent_address?: string | null;
  city?: string | null;
  thana?: string | null;
  postal_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  known_allergies?: string | null;
  chronic_illness?: string | null;
  physical_disabilities?: string | null;
  special_needs?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  vaccination_status?: string | null;
  birth_certificate_no?: string | null;
  national_id_no?: string | null;
  passport_no?: string | null;
  fee_category?: string | null;
  scholarship_type?: string | null;
  portal_username?: string | null;
  portal_access_student?: boolean;
  portal_access_parent?: boolean;
  remarks?: string | null;
  rfid_nfc_no?: string | null;
  hostel_status?: string | null;
  library_card_no?: string | null;
  status: string;
  photo_url?: string | null;
  email?: string;
  phone?: string;
};

export type Guardian = {
  id: string;
  school_id?: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  id_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
  photo_url?: string | null;
};

export type StudentDocument = {
  id: string;
  school_id: string;
  uploaded_by_user_id: string;
  entity_type: string;
  entity_id: string;
  filename: string;
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

export async function getStudents(params?: {
  page?: number;
  limit?: number;
  class_id?: string;
  section_id?: string;
  search?: string;
  status?: string;
  gender?: string;
}): Promise<{ items: Student[]; total: number; page: number; limit: number }> {
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
  full_name_bc?: string | null;
  place_of_birth?: string | null;
  nationality?: string | null;
  religion?: string | null;
  blood_group?: string | null;
  admission_date?: string | null;
  admission_status?: string;
  medium?: string | null;
  shift?: string | null;
  previous_school_name?: string | null;
  previous_class?: string | null;
  transfer_certificate_no?: string | null;
  present_address?: string | null;
  permanent_address?: string | null;
  city?: string | null;
  thana?: string | null;
  postal_code?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  known_allergies?: string | null;
  chronic_illness?: string | null;
  physical_disabilities?: string | null;
  special_needs?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  vaccination_status?: string | null;
  birth_certificate_no?: string | null;
  national_id_no?: string | null;
  passport_no?: string | null;
  fee_category?: string | null;
  scholarship_type?: string | null;
  portal_username?: string | null;
  portal_access_student?: boolean;
  portal_access_parent?: boolean;
  remarks?: string | null;
  rfid_nfc_no?: string | null;
  hostel_status?: string | null;
  library_card_no?: string | null;
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
    full_name_bc?: string | null;
    place_of_birth?: string | null;
    nationality?: string | null;
    religion?: string | null;
    blood_group?: string | null;
    admission_date?: string | null;
    admission_status?: string;
    medium?: string | null;
    shift?: string | null;
    previous_school_name?: string | null;
    previous_class?: string | null;
    transfer_certificate_no?: string | null;
    present_address?: string | null;
    permanent_address?: string | null;
    city?: string | null;
    thana?: string | null;
    postal_code?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    known_allergies?: string | null;
    chronic_illness?: string | null;
    physical_disabilities?: string | null;
    special_needs?: string | null;
    doctor_name?: string | null;
    doctor_phone?: string | null;
    vaccination_status?: string | null;
    birth_certificate_no?: string | null;
    national_id_no?: string | null;
    passport_no?: string | null;
    fee_category?: string | null;
    scholarship_type?: string | null;
    portal_username?: string | null;
    portal_access_student?: boolean | null;
    portal_access_parent?: boolean | null;
    remarks?: string | null;
    rfid_nfc_no?: string | null;
    hostel_status?: string | null;
    library_card_no?: string | null;
    status?: string;
    photo_url?: string | null;
  },
): Promise<Student> {
  const resp = await api.put(`/students/${studentId}`, payload);
  return resp.data;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await api.delete(`/students/${studentId}`);
}

export async function uploadStudentPhoto(
  studentId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/students/${studentId}/photo`, formData);
}

export async function uploadStudentDocument(
  studentId: string,
  file: File,
): Promise<StudentDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await api.post(`/students/${studentId}/documents`, formData);
  return resp.data;
}

export async function createGuardian(payload: {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  occupation?: string | null;
  id_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
}): Promise<Guardian> {
  const resp = await api.post("/guardians", payload);
  return resp.data;
}

export async function uploadGuardianPhoto(
  guardianId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  await api.post(`/guardians/${guardianId}/photo`, formData);
}

export async function linkGuardianToStudent(
  studentId: string,
  payload: { guardian_id: string; relation?: string; is_primary?: boolean },
): Promise<void> {
  await api.post(`/students/${studentId}/guardians`, payload);
}

export type Enrollment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string | null;
  roll_number: number | null;
  status: string;
};

export async function getEnrollmentsByStudents(
  studentIds: string[],
  academicYearId?: string,
): Promise<Enrollment[]> {
  const resp = await api.get("/enrollments/by-students", {
    params: {
      student_ids: studentIds.join(","),
      academic_year_id: academicYearId || undefined,
    },
  });
  return resp.data;
}

export async function createEnrollment(payload: {
  student_id: string;
  academic_year_id: string;
  class_id: string;
  section_id?: string | null;
  roll_number?: number | null;
  status?: string;
}): Promise<Enrollment> {
  const resp = await api.post("/enrollments", {
    ...payload,
    section_id: payload.section_id ?? null,
    roll_number: payload.roll_number ?? null,
    status: payload.status ?? "active",
  });
  return resp.data;
}

export async function updateEnrollment(
  enrollmentId: string,
  payload: {
    academic_year_id?: string;
    class_id?: string;
    section_id?: string | null;
    roll_number?: number | null;
    status?: string;
  },
): Promise<Enrollment> {
  const resp = await api.put(`/enrollments/${enrollmentId}`, payload);
  return resp.data;
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
  params?: { start_date?: string; end_date?: string },
): Promise<StudentAttendanceRecord[]> {
  const resp = await api.get(`/students/${studentId}/attendance`, { params });
  return resp.data;
}

export async function getStudentAttendanceSummary(
  studentId: string,
  params?: { start_date?: string; end_date?: string },
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
  studentId: string,
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
  studentId: string,
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
  limit = 100,
): Promise<{ items: Staff[]; total: number }> {
  const resp = await api.get("/staff", {
    params: { page, limit },
  });
  return resp.data;
}

export async function getUsers(
  page = 1,
  limit = 100,
): Promise<{ items: User[]; total: number }> {
  const resp = await api.get("/users", {
    params: { page, limit },
  });
  return resp.data;
}
