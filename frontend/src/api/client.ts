import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Flag to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const AUTH_STORAGE_KEY = "kuskul_auth";

// Request interceptor to add X-School-Id header
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.activeSchoolId) {
        config.headers["X-School-Id"] = parsed.activeSchoolId;
      }
    }
  } catch {
    // Ignore errors
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  async (response) => {
    const originalRequest = response.config as any;

    // Handle 401 when validateStatus allows it (e.g. safeRequest)
    // We check !originalRequest._retry to avoid infinite loops
    if (
      response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            // If refresh failed, we still return the original response so the app can handle it
            return response;
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        // Retry original request
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // If refresh fails, return original response (401)
        return response;
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 when validateStatus throws error (standard axios usage)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
