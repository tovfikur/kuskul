export function statusColor(status: string):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" {
  const s = (status || "").toLowerCase();
  if (s === "published") return "success";
  if (s === "running") return "info";
  if (s === "scheduled") return "primary";
  if (s === "completed") return "secondary";
  return "default";
}

export const examStatusOptions = [
  "draft",
  "scheduled",
  "running",
  "completed",
  "published",
] as const;

export const aggregationOptions = ["sum", "average", "best"] as const;

