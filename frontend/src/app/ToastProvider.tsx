import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { type AlertColor } from "@mui/material/Alert";
import {
  registerToastHandler,
  unregisterToastHandler,
  type ToastOptions,
} from "./toast";

type ToastState = ToastOptions & { key: number };

type Props = {
  children: ReactNode;
};

export function ToastProvider({ children }: Props) {
  const [state, setState] = useState<{
    current: ToastState | null;
    queue: ToastState[];
  }>({
    current: null,
    queue: [],
  });

  const enqueueToast = useCallback((toast: ToastOptions) => {
    setState((prev) => {
      const next: ToastState = {
        key: Date.now() + Math.random(),
        ...toast,
      };
      if (!prev.current) {
        return { current: next, queue: prev.queue };
      }
      return { current: prev.current, queue: [...prev.queue, next] };
    });
  }, []);

  useEffect(() => {
    registerToastHandler(enqueueToast);
    return () => {
      unregisterToastHandler(enqueueToast);
    };
  }, [enqueueToast]);

  const handleClose = useCallback((_event?: unknown, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setState((prev) => {
      if (prev.queue.length === 0) {
        return { current: null, queue: [] };
      }
      const [next, ...rest] = prev.queue;
      return { current: next, queue: rest };
    });
  }, []);

  const current = state.current;

  return (
    <>
      {children}
      <Snackbar
        key={current?.key}
        open={Boolean(current)}
        autoHideDuration={current?.autoHideDuration ?? 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {current ? (
          <MuiAlert
            elevation={6}
            variant="filled"
            onClose={handleClose}
            severity={(current.severity as AlertColor) ?? "info"}
            sx={{ width: "100%" }}
          >
            {current.message}
          </MuiAlert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
