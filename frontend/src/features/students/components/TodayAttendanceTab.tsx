import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Cancel, CheckCircle, Groups, Refresh, BeachAccess, Schedule } from "@mui/icons-material";

import { api } from "../../../api/client";
import { showToast } from "../../../app/toast";

type SectionSummary = {
  class_id: string;
  class_name: string;
  section_id: string | null;
  section_name: string;
  total_students: number;
  present: number;
  late: number;
  absent: number;
  leave: number;
};

type TodaySummary = { date: string; sections: SectionSummary[] };

const stats = [
  { key: "total_students", label: "Total Students", color: "#2563EB", icon: <Groups fontSize="small" /> },
  { key: "present", label: "Present", color: "#16A34A", icon: <CheckCircle fontSize="small" /> },
  { key: "late", label: "Late", color: "#D97706", icon: <Schedule fontSize="small" /> },
  { key: "absent", label: "Absent", color: "#DC2626", icon: <Cancel fontSize="small" /> },
  { key: "leave", label: "Leave", color: "#D97706", icon: <BeachAccess fontSize="small" /> },
] as const;

export default function TodayAttendanceTab() {
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get("/attendance/students/today-summary");
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to load today's attendance", error);
      showToast({ severity: "error", message: "Failed to load today's attendance." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => (summary?.sections || []).reduce(
    (result, section) => ({
      total_students: result.total_students + section.total_students,
      present: result.present + section.present,
      late: result.late + section.late,
      absent: result.absent + section.absent,
      leave: result.leave + section.leave,
    }),
    { total_students: 0, present: 0, late: 0, absent: 0, leave: 0 },
  ), [summary]);

  // A null section is the class-level fallback bucket for enrolments that are
  // not assigned to a section. When a class has actual sections, show those
  // section cards instead of an additional class-level card.
  const displayCards = useMemo(() => {
    const sections = summary?.sections || [];
    const classIdsWithSections = new Set(
      sections.filter((section) => section.section_id !== null).map((section) => section.class_id),
    );

    return sections.filter(
      (section) => section.section_id !== null || !classIdsWithSections.has(section.class_id),
    );
  }, [summary]);

  if (loading) return <Box sx={{ minHeight: 320, display: "grid", placeItems: "center" }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Today’s Attendance</Typography>
          <Typography variant="body2" color="text.secondary">{summary?.date || "Today"} · All dates and cutoffs use Asia/Dhaka (UTC+06:00).</Typography>
        </Box>
        <Tooltip title="Refresh attendance summary"><IconButton onClick={load} aria-label="Refresh today attendance"><Refresh /></IconButton></Tooltip>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" }, gap: 2, mb: 3 }}>
        {stats.map((stat) => <Card key={stat.key} variant="outlined" sx={{ bgcolor: "#fff", borderColor: `${stat.color}55`, borderRadius: 3 }}>
          <CardContent sx={{ py: "16px !important" }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography variant="h5" fontWeight={800}>{totals[stat.key]}</Typography><Typography variant="caption" color="text.secondary">{stat.label}</Typography></Box><Box sx={{ color: stat.color }}>{stat.icon}</Box></Stack></CardContent>
        </Card>)}
      </Box>

      {displayCards.length ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }, gap: 2 }}>
        {displayCards.map((section) => <Card key={`${section.class_id}-${section.section_id || "none"}`} variant="outlined" sx={{
          bgcolor: "#fff", borderColor: "#D7E1F0", borderRadius: 3, transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)", borderColor: "primary.main" },
        }}>
          <CardContent><Typography variant="overline" color="primary.main" fontWeight={700}>{section.class_name}</Typography><Typography variant="h6" fontWeight={750} mb={2}> {section.section_name}</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1 }}>
              {stats.map((stat) => <Box key={stat.key} sx={{ textAlign: "center", borderRadius: 2, bgcolor: `${stat.color}0D`, py: 1 }}><Typography variant="h6" color={stat.color} fontWeight={800}>{section[stat.key]}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>{stat.label.replace("Students", "")}</Typography></Box>)}
            </Box>
          </CardContent>
        </Card>)}
      </Box> : <Card variant="outlined" sx={{ borderStyle: "dashed", borderColor: "#CBD5E1", bgcolor: "#fff" }}><CardContent><Typography color="text.secondary">No active class/section enrolments were found for the current academic year.</Typography></CardContent></Card>}
    </Box>
  );
}
