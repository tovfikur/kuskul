import { api } from "./client";

export type AdminDashboardData = {
  students: number;
  staff: number;
  total_due_amount: number;
  my_unread_notifications: number;
};

export type AttendanceStats = {
  window_days: number;
  student_records: number;
  staff_records: number;
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const resp = await api.get("/analytics/dashboard/admin");
  return resp.data;
}

export async function getAttendanceStats(): Promise<AttendanceStats> {
  const resp = await api.get("/analytics/statistics/attendance");
  return resp.data;
}
