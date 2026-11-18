import { api } from "./client";

export type CommunicationLog = {
  id: string;
  school_id: string;
  sent_by_user_id: string;
  communication_type: string;
  status: string;
  recipient: string;
  subject: string | null;
  body: string | null;
  student_id: string | null;
  category: string | null;
  provider_result: string | null;
  created_at: string;
};

export type CommunicationLogFilters = {
  communication_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
};

export async function listCommunicationLogs(
  filters: CommunicationLogFilters = {}
): Promise<CommunicationLog[]> {
  const resp = await api.get("/communication-logs", { params: filters });
  return resp.data;
}