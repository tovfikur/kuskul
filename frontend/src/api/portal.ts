/**
 * Portal API — calls /parent/* endpoints which require only parent_portal:read permission.
 * Used by both StudentPortalPage (via /student-self/*) and GuardianPortalPage (via /parent/*).
 */
import { api } from "./client";

// ─── Shared types ───────────────────────────────────────────────────────────

export type PortalStudent = {
  id: string;
  first_name: string;
  last_name?: string | null;
  admission_no?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  blood_group?: string | null;
  present_address?: string | null;
  status: string;
  photo_url?: string | null;
  nationality?: string | null;
  religion?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PortalAttendanceRecord = {
  id: string;
  attendance_date: string;
  status: string;
};

export type PortalFeeDue = {
  id: string;
  student_id: string;
  academic_year_id: string;
  total_fee: number;
  discount_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  last_calculated_date: string | null;
};

export type PortalFeePayment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  is_refund: boolean;
};

export type PortalTimetableEntry = {
  id: string;
  day_of_week: number;
  subject_id: string | null;
  staff_id: string | null;
  room: string | null;
  start_time: string | null;
  end_time: string | null;
  time_slot_id: string | null;
};

export type PortalGuardian = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  relation: string;
  is_primary: boolean;
};

export type PortalNotice = {
  id: string;
  title: string;
  content?: string | null;
  published_at: string | null;
};

export type ParentProfile = {
  user_id: string;
  guardian_id: string;
  full_name: string;
  phone?: string | null;
  email: string;
  address?: string | null;
  photo_url?: string | null;
};

export type ChildStudent = {
  id: string;
  first_name: string;
  last_name?: string | null;
  admission_no?: string | null;
  photo_url?: string | null;
  status: string;
};

// ─── Student self-service (role=student) ────────────────────────────────────

export async function getStudentSelfProfile(): Promise<PortalStudent> {
  const resp = await api.get("/parent/student-self/profile");
  return resp.data;
}

export async function getStudentSelfAttendance(): Promise<PortalAttendanceRecord[]> {
  const resp = await api.get("/parent/student-self/attendance");
  return resp.data;
}

export async function getStudentSelfAttendanceSummary(): Promise<Record<string, number>> {
  const resp = await api.get("/parent/student-self/attendance/summary");
  return resp.data;
}

export async function getStudentSelfTimetable(): Promise<PortalTimetableEntry[]> {
  const resp = await api.get("/parent/student-self/timetable");
  return resp.data;
}

export async function getStudentSelfFeeDues(): Promise<PortalFeeDue[]> {
  const resp = await api.get("/parent/student-self/fee-dues");
  return resp.data;
}

export async function getStudentSelfFeePayments(): Promise<PortalFeePayment[]> {
  const resp = await api.get("/parent/student-self/fee-payments");
  return resp.data;
}

export async function getStudentSelfGuardians(): Promise<PortalGuardian[]> {
  const resp = await api.get("/parent/student-self/guardians");
  return resp.data;
}

export async function getStudentSelfNotices(): Promise<PortalNotice[]> {
  const resp = await api.get("/parent/student-self/notices");
  return resp.data;
}

// ─── Parent portal (role=parent) ────────────────────────────────────────────

export async function getParentProfile(): Promise<ParentProfile> {
  const resp = await api.get("/parent/profile");
  return resp.data;
}

export async function getParentChildren(): Promise<ChildStudent[]> {
  const resp = await api.get("/parent/children");
  return resp.data;
}

export async function getParentChildAttendance(
  studentId: string,
  month: number,
  year: number,
): Promise<{ date: string; status: string }[]> {
  const resp = await api.get(`/parent/attendance/${studentId}/month`, {
    params: { month, year },
  });
  return resp.data;
}

export async function getParentChildTimetable(studentId: string): Promise<PortalTimetableEntry[]> {
  const resp = await api.get(`/parent/timetable/${studentId}`);
  return resp.data;
}

export async function getParentChildFees(studentId: string): Promise<{
  due_amount: number;
  paid_amount: number;
  history: {
    payment_date: string;
    amount: number;
    method: string | null;
    reference: string | null;
    is_refund: boolean;
  }[];
}> {
  const resp = await api.get(`/parent/fees/${studentId}`);
  return resp.data;
}

export async function getParentChildResults(
  studentId: string,
): Promise<{ exam_id: string; total_marks: number; obtained_marks: number; percentage: number }[]> {
  const resp = await api.get(`/parent/results/${studentId}`);
  return resp.data;
}

export async function getParentNotices(): Promise<PortalNotice[]> {
  const resp = await api.get("/parent/notices");
  return resp.data;
}

export async function getParentChildDashboard(studentId: string): Promise<{
  student: PortalStudent;
  academic_year: string | null;
  attendance_today: string | null;
  fee_due_amount: number;
  latest_notice: { title: string; published_at: string } | null;
}> {
  const resp = await api.get(`/parent/dashboard/${studentId}`);
  return resp.data;
}
