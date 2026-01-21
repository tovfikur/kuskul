import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { api } from "./client";
import { store } from "../app/store";
import { setAccessToken, signOut } from "../features/auth/authSlice";
import { showToast } from "../app/toast";

export function setupInterceptors() {
  api.interceptors.request.use((config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    const schoolId = state.auth.activeSchoolId;

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (schoolId) {
      config.headers = config.headers ?? {};
      if (!config.headers["X-School-Id"]) {
        config.headers["X-School-Id"] = schoolId;
      }
    }

    // Debug: Log requests to staff endpoints
    if (config.url?.includes("/staff/")) {
      console.log("[DEBUG] API Request:", {
        url: config.url,
        schoolId: schoolId,
        hasSchoolIdHeader: !!config.headers?.["X-School-Id"],
        headers: config.headers,
      });
    }

    return config;
  });

  let refreshPromise: Promise<string> | null = null;

  async function refreshAccessToken(): Promise<string> {
    // We use a new instance or the same api instance?
    // If we use 'api', we must ensure we don't trigger the interceptor loop if 401 happens again?
    // But this is a specific endpoint.
    // Usually /auth/refresh doesn't require auth header (it uses cookie).
    // So request interceptor adding token is fine (it might be ignored or overwritten).
    const resp = await api.post("/auth/refresh");
    return resp.data.access_token as string;
  }

  function sanitizeMessage(raw: string): string {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text.startsWith("<") && text.includes("</")) {
      return "Unexpected server response.";
    }
    if (text.length > 200) {
      return `${text.slice(0, 197)}...`;
    }
    return text;
  }

  function buildErrorMessage(data: unknown, status?: number): string {
    if (typeof data === "string") {
      return sanitizeMessage(data);
    }

    if (data && typeof data === "object") {
      const anyData = data as Record<string, unknown>;

      if (typeof anyData.detail === "string") {
        return sanitizeMessage(anyData.detail);
      }

      if (Array.isArray(anyData.detail)) {
        const items = anyData.detail
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            const obj = item as Record<string, unknown>;
            const msg = typeof obj.msg === "string" ? obj.msg : null;
            const loc = Array.isArray(obj.loc)
              ? obj.loc
                  .slice(1)
                  .map((p) => String(p))
                  .join(".")
              : null;
            if (msg && loc) {
              return `${loc}: ${msg}`;
            }
            if (msg) {
              return msg;
            }
            return null;
          })
          .filter((v): v is string => Boolean(v));

        if (items.length > 0) {
          const joined =
            items.length > 3
              ? `${items.slice(0, 3).join("; ")}; and more`
              : items.join("; ");
          return sanitizeMessage(`Some fields are invalid: ${joined}`);
        }
      }

      if (typeof anyData.error === "string") {
        return sanitizeMessage(anyData.error);
      }

      if (typeof anyData.message === "string") {
        return sanitizeMessage(anyData.message);
      }
    }

    if (status === 400) {
      return "The request is invalid. Please check your input.";
    }
    if (status === 401) {
      return "You are not authorized. Please sign in again.";
    }
    if (status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (status === 404) {
      return "The requested resource was not found.";
    }
    if (status === 409) {
      return "This action conflicts with existing data.";
    }
    if (status === 422) {
      return "Some fields are invalid. Please review your input.";
    }
    if (typeof status === "number" && status >= 500) {
      return "The server encountered an error. Please try again later.";
    }

    if (typeof status === "number") {
      return `Request failed with status ${status}`;
    }
    return "Network error. Please check your connection.";
  }

  api.interceptors.response.use(
    (resp) => {
      const method = resp.config.method?.toLowerCase();
      const url = resp.config.url ?? "";
      const status = resp.status;

      if (
        method &&
        ["post", "put", "patch", "delete"].includes(method) &&
        status >= 200 &&
        status < 300 &&
        !url.includes("/auth/refresh") &&
        !url.includes("/auth/login")
      ) {
        const data = resp.data as unknown;
        let message = "";

        if (typeof data === "string") {
          message = sanitizeMessage(data);
        } else if (data && typeof data === "object") {
          const anyData = data as Record<string, unknown>;
          if (typeof anyData.detail === "string") {
            message = anyData.detail;
          } else if (typeof anyData.message === "string") {
            message = anyData.message;
          } else if (typeof anyData.success === "string") {
            message = anyData.success;
          }
        }

        if (!message) {
          message = "Action completed successfully";
        }

        showToast({
          severity: "success",
          message,
        });
      }

      return resp;
    },
    async (error: AxiosError) => {
      const status = error.response?.status;
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (!original) {
        showToast({
          severity: "error",
          message: "Unexpected error occurred.",
        });
        return Promise.reject(error);
      }

      const url = original.url ?? "";

      if (url.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      if (status === 401 && !original._retry && !url.includes("/auth/login")) {
        original._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
              refreshPromise = null;
            });
          }
          const newToken = await refreshPromise;
          store.dispatch(setAccessToken(newToken));
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api.request(original);
        } catch (e) {
          store.dispatch(signOut());
          showToast({
            severity: "error",
            message: "Session expired. Please sign in again.",
          });
          return Promise.reject(e);
        }
      }

      const data = error.response?.data as unknown;
      const message = buildErrorMessage(data, status);

      showToast({
        severity: "error",
        message,
      });

      return Promise.reject(error);
    }
  );
}
