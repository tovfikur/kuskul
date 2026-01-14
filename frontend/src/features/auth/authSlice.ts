import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import * as authApi from "../../api/auth";

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
  errorMessage: string | null;
};

const initialState: AuthState = {
  accessToken: null,
  email: null,
  memberships: [],
  activeSchoolId: null,
  status: "idle",
  errorMessage: null,
};

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
    },
    setActiveSchoolId(state, action: PayloadAction<string | null>) {
      state.activeSchoolId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.errorMessage = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.status = "idle";
        state.accessToken = action.payload.token.access_token;
        state.email = action.payload.profile.email;
        state.memberships = action.payload.profile.memberships;
        state.activeSchoolId =
          action.payload.profile.memberships[0]?.school_id ?? null;
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
      });
  },
});

export const { setAccessToken, setActiveSchoolId } = slice.actions;
export default slice.reducer;
