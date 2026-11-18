import { api } from "./client";

export type Notice = {
  id: string;
  school_id: string;
  notice_type: string | null;
  target_audience: string | null;
  title: string;
  content: string;
  attachment_url: string | null;
  is_published: boolean;
};

export async function getActiveNotices(): Promise<Notice[]> {
  const resp = await api.get("/notices/active");
  return resp.data;
}
