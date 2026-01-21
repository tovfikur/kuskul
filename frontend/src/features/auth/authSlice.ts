import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import * as authApi from "../../api/auth";

const AUTH_STORAGE_KEY = "kuskul_auth";

type AuthState = {
  accessToken: string | null;
  email: string | null;
  memberships: Array<{
    school_id: string;
    role_id: string;
    school_name: string;
  }>;
  activeSchoolId: string | null;
  status: "idle" | "loading" | "error";
  sessionChecked: boolean;
  errorMessage: string | null;
};

// Try to restore auth data from localStorage
function getStoredAuth(): { token: string | null; schoolId: string | null } {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        token: parsed.accessToken || null,
        schoolId: parsed.activeSchoolId || null,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { token: null, schoolId: null };
}

function saveAuthToStorage(accessToken: string | null, activeSchoolId: string | null) {
  try {
    if (accessToken) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, activeSchoolId }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

const storedAuth = getStoredAuth();

const initialState: AuthState = {
  accessToken: storedAuth.token,
  email: null,
  memberships: [],
  activeSchoolId: storedAuth.schoolId,
  status: "idle",
  sessionChecked: false,
  errorMessage: null,
};

// Restore session from cookie/token on app load
export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const token = state.auth.accessToken;
    // Try to get profile - if cookie is valid, this will work
    const profile = await authApi.me(token || undefined);
    return { profile, token };
  }
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (payload: authApi.LoginRequest) => {
    const token = await authApi.login(payload);
    const profile = await authApi.me(token.access_token);
    return { token, profile };
  }
);

export const signOut = createAsyncThunk("auth/signOut", async () => {
  try {
    await authApi.logout();
  } catch {
    return;
  }
});

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      saveAuthToStorage(action.payload, state.activeSchoolId);
    },
    setActiveSchoolId(state, action: PayloadAction<string | null>) {
      state.activeSchoolId = action.payload;
      saveAuthToStorage(state.accessToken, action.payload);
    },
    markSessionChecked(state) {
      state.sessionChecked = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = "loading";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.status = "idle";
        state.sessionChecked = true;
        state.email = action.payload.profile.email;
        state.memberships = action.payload.profile.memberships;
        state.activeSchoolId =
          action.payload.profile.memberships[0]?.school_id ?? null;
        // Keep existing token or use null (cookie-based auth)
        if (action.payload.token) {
          state.accessToken = action.payload.token;
        }
        saveAuthToStorage(state.accessToken, state.activeSchoolId);
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = "idle";
        state.sessionChecked = true;
        state.accessToken = null;
        state.email = null;
        state.memberships = [];
        state.activeSchoolId = null;
        saveAuthToStorage(null, null);
      })
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.errorMessage = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = "idle";
        state.sessionChecked = true;
        state.accessToken = action.payload.token.access_token;
        state.email = action.payload.profile.email;
        state.memberships = action.payload.profile.memberships;
        state.activeSchoolId =
          action.payload.profile.memberships[0]?.school_id ?? null;
        saveAuthToStorage(state.accessToken, state.activeSchoolId);
      })
      .addCase(signIn.rejected, (state) => {
        state.status = "error";
        state.errorMessage = "Login failed";
      })
      .addCase(signOut.fulfilled, (state) => {
        state.accessToken = null;
        state.email = null;
        state.memberships = [];
        state.activeSchoolId = null;
        state.status = "idle";
        state.errorMessage = null;
        saveAuthToStorage(null, null);
      });
  },
});

export const { setAccessToken, setActiveSchoolId, markSessionChecked } = slice.actions;
export default slice.reducer;
