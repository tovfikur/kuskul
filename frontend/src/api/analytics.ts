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

export type FinancialStats = {
  due: number;
  paid: number;
};

export async function getFinancialStats(): Promise<FinancialStats> {
  const resp = await api.get("/analytics/statistics/financial");
  return resp.data;
}

export type EnrollmentTrend = {
  academic_year_id: string;
  name: string;
  enrollments: number;
};

export async function getEnrollmentTrends(): Promise<EnrollmentTrend[]> {
  const resp = await api.get("/analytics/trends/enrollment");
  return resp.data;
}

export type PerformanceTrend = {
  exam_id: string;
  exam_name: string;
  avg_pct: number;
};

export async function getPerformanceTrends(): Promise<PerformanceTrend[]> {
  const resp = await api.get("/analytics/trends/performance");
  return resp.data;
}

export interface Event {
  id: string;
  school_id: string;
  event_type: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  announced_by?: string;
  is_all_day: boolean;
};

export interface EventCreate {
  event_type?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  announced_by?: string;
  is_all_day: boolean;
};

export type EventUpdate = Partial<EventCreate>;

export async function getUpcomingEvents(): Promise<Event[]> {
  const resp = await api.get("/events/upcoming");
  return resp.data;
}

export async function listEvents(params?: {
  start_date?: string;
  end_date?: string;
  event_type?: string;
}): Promise<Event[]> {
  const resp = await api.get("/events", { params });
  return resp.data;
}

export async function getEvent(id: string): Promise<Event> {
  const resp = await api.get(`/events/${id}`);
  return resp.data;
}

export async function createEvent(data: EventCreate): Promise<Event> {
  const resp = await api.post("/events", data);
  return resp.data;
}

export async function updateEvent(id: string, data: EventUpdate): Promise<Event> {
  const resp = await api.put(`/events/${id}`, data);
  return resp.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/events/${id}`);
}

export async function getCalendar(month: number, year: number): Promise<{
  month: number;
  year: number;
  days: Record<string, Event[]>;
}> {
  const resp = await api.get("/events/calendar", { params: { month, year } });
  return resp.data;
}

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  details: string;
  created_at: string;
  user_id?: string;
};

export async function getRecentAuditLogs(): Promise<AuditLog[]> {
  const resp = await api.get("/audit_logs", { params: { limit: 5 } });
  return resp.data.items;
}
