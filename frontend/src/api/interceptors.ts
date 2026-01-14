import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { api } from "./client";
import { store } from "../app/store";
import { setAccessToken, signOut } from "../features/auth/authSlice";

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

  api.interceptors.response.use(
    (resp) => resp,
    async (error: AxiosError) => {
      const status = error.response?.status;
      const original = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (!original) {
        return Promise.reject(error);
      }

      // Avoid infinite loop on refresh token failure
      if (original.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      if (status === 401 && !original._retry) {
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
          return Promise.reject(e);
        }
      }

      return Promise.reject(error);
    }
  );
}
