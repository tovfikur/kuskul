import type { BulkRow } from "./types";

export function newBulkRow(seed: number): BulkRow {
  return {
    id: `r_${seed}`,
    class_id: "",
    subject_id: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    room: "",
    max_marks: "100",
  };
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (start && end) return `${start}–${end}`;
  if (start) return `${start}–`;
  if (end) return `–${end}`;
  return "-";
}

