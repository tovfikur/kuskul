import type { AxiosRequestConfig } from "axios";

import { api } from "./client";

export type SafeResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: unknown };

export async function safeRequest<T>(config: AxiosRequestConfig): Promise<SafeResult<T>> {
  const resp = await api.request({
    ...config,
    validateStatus: () => true,
  });
  if (resp.status >= 200 && resp.status < 300) {
    return { ok: true, status: resp.status, data: resp.data as T };
  }
  // Debug: log error responses
  console.error("[API Error]", resp.status, config.url, JSON.stringify(resp.data, null, 2));
  return { ok: false, status: resp.status, data: resp.data as unknown };
}

