import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { restoreSession } from "./authSlice";

export function RequireAuth({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const token = useAppSelector((s) => s.auth.accessToken);
  const sessionChecked = useAppSelector((s) => s.auth.sessionChecked);
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    // If we haven't checked the session yet, try to restore it
    if (!sessionChecked && status !== "loading") {
      dispatch(restoreSession());
    }
  }, [dispatch, sessionChecked, status]);

  // Show loading while checking session
  if (!sessionChecked || status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If session checked and no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
