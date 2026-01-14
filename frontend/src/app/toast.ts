export type ToastSeverity = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  message: string;
  severity?: ToastSeverity;
  autoHideDuration?: number;
};

type ToastHandler = (toast: ToastOptions) => void;

let handler: ToastHandler | null = null;

export function registerToastHandler(fn: ToastHandler) {
  handler = fn;
}

export function unregisterToastHandler(fn: ToastHandler) {
  if (handler === fn) {
    handler = null;
  }
}

export function showToast(toast: ToastOptions) {
  if (handler) {
    handler(toast);
  }
}
