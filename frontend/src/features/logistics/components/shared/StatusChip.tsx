import { Chip } from "@mui/material";

type StatusChipProps = {
  status: string;
  size?: "small" | "medium";
};

export default function StatusChip({ status, size = "small" }: StatusChipProps) {
  const getColor = (): "success" | "warning" | "error" | "info" | "default" => {
    const s = status?.toLowerCase();
    switch (s) {
      case "active":
      case "approved":
      case "received":
      case "done":
      case "in_use":
        return "success";
      case "draft":
      case "submitted":
      case "open":
      case "in_progress":
        return "info";
      case "partial":
      case "in_repair":
        return "warning";
      case "rejected":
      case "cancelled":
      case "retired":
      case "inactive":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Chip
      label={status?.toUpperCase() || "UNKNOWN"}
      color={getColor()}
      size={size}
    />
  );
}
