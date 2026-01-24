import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from "@mui/material";
import {
  School,
  PeopleAlt,
  SupervisorAccount,
  FamilyRestroom,
} from "@mui/icons-material";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setActiveSchoolId } from "../features/auth/authSlice";
import {
  getAdminDashboard,
  getFinancialStats,
  getEnrollmentTrends,
  getPerformanceTrends,
  getUpcomingEvents,
  type EnrollmentTrend,
  type PerformanceTrend,
  type Event as CalendarEvent,
} from "../api/analytics";
import { format } from "date-fns";

// Color Palette matching reference
const COLORS = {
  coral: "#FF9A8B",
  purple: "#7E6BC4",
  yellow: "#FFD166",
  green: "#06D6A0",
  bg: "#F5F4F8",
  cardBg: "#FFFFFF",
  textPrimary: "#2D3748",
  textSecondary: "#718096",
  border: "#E2E8F0",
};

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function MetricCard({ label, value, icon, color, loading }: MetricCardProps) {
  return (
    <Box sx={{ position: "relative", height: "100%" }}>
      <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, bgcolor: color, borderRadius: "4px 0 0 4px" }} />
      <Card elevation={0} sx={{ height: "100%", bgcolor: COLORS.cardBg, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
        <CardContent sx={{ p: 3, textAlign: "center" }}>
          <Avatar sx={{ bgcolor: `${color}20`, color: color, width: 48, height: 48, mx: "auto", mb: 2 }}>{icon}</Avatar>
          <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: "block", mb: 1, fontWeight: 600 }}>{label}</Typography>
          {loading ? <CircularProgress size={24} /> : <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>{value}</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const memberships = useAppSelector((s) => s.auth.memberships);
  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ admin: null, performance: [], events: [] });

  useEffect(() => {
    if (!activeSchoolId) return;
    loadData();
  }, [activeSchoolId]);

  async function loadData() {
    setLoading(true);
    try {
      const [admin, perf, events] = await Promise.all([
        getAdminDashboard(),
        getPerformanceTrends().catch(() => []),
        getUpcomingEvents().catch(() => []),
      ]);
      setData({ admin, performance: perf, events });
    } finally {
      setLoading(false);
    }
  }

  const totalStudents = data.admin?.students ?? 0;
  const totalStaff = data.admin?.staff ?? 0;
  const schoolName = memberships.find(m => m.school_id === activeSchoolId)?.school_name || "School";
  const currentYear = new Date().getFullYear();

  const stageData = [
    { stage: "Primary School", count: Math.floor(totalStudents * 0.3), color: COLORS.purple },
    { stage: "Elementary School", count: Math.floor(totalStudents * 0.5), color: COLORS.yellow },
    { stage: "Preschool", count: Math.floor(totalStudents * 0.2), color: COLORS.green },
  ];

  const months = [
    { name: "January", color: COLORS.coral }, { name: "February", color: COLORS.yellow }, { name: "March", color: COLORS.yellow },
    { name: "April", color: COLORS.green, current: true }, { name: "May", color: COLORS.yellow }, { name: "June", color: COLORS.yellow },
    { name: "July", color: COLORS.coral }, { name: "August", color: COLORS.yellow }, { name: "September", color: COLORS.yellow },
    { name: "October", color: COLORS.coral }, { name: "November", color: COLORS.yellow }, { name: "December", color: COLORS.coral },
  ];

  const topPerformers = data.performance.slice(0, 3).map((p: any, i: number) => ({
    name: p.exam_name, score: p.avg_pct, rank: i + 1, color: [COLORS.green, COLORS.purple, COLORS.yellow][i],
  }));

  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>Welcome to {schoolName}</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>
            School Year {currentYear} - {currentYear + 1}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select value={activeSchoolId ?? ""} onChange={(e) => dispatch(setActiveSchoolId(e.target.value || null))} sx={{ bgcolor: "white", fontSize: "0.875rem" }}>
              {memberships.map((m) => (<MenuItem key={m.school_id} value={m.school_id}>{m.school_name}</MenuItem>))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Row 1: Metric Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, mb: 3 }}>
        <MetricCard label="Schools" value="1" icon={<School />} color={COLORS.coral} loading={loading} />
        <MetricCard label="Teachers" value={totalStaff} icon={<PeopleAlt />} color={COLORS.purple} loading={loading} />
        <MetricCard label="Students" value={totalStudents} icon={<SupervisorAccount />} color={COLORS.yellow} loading={loading} />
        <MetricCard label="Parents" value={Math.floor(totalStudents * 1.8)} icon={<FamilyRestroom />} color={COLORS.green} loading={loading} />
      </Box>

      {/* Row 2: Today's Timetable (LEFT) and Educational Stage (RIGHT) */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, mb: 3 }}>
        {/* Today's Timetable */}
        <Card elevation={0} sx={{ bgcolor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 3 }}>
            Today's Timetable
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600 }}>
              {format(new Date(), "EEEE, MMMM dd")}
            </Typography>
          </Box>

          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Timetable integration coming soon
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Connect to timetable API to display today's schedule
            </Typography>
          </Box>
        </Card>

        {/* Educational Stage */}
        <Card elevation={0} sx={{ bgcolor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>Educational Stage</Typography>
            <Typography variant="caption" sx={{ color: COLORS.textSecondary }}>All data in Thousand {currentYear} - {currentYear + 1}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, minWidth: 180 }}>
              {stageData.map((stage, idx) => (
                <Box key={idx}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: stage.color }} />
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.875rem" }}>{stage.stage}</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={800} sx={{ ml: 2.5 }}>{stage.count}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ flexGrow: 1, height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={stageData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="stage" hide />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {stageData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Row 3: Activities and Top Performance - Side by Side */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {/* Activities & Events */}
        <Card elevation={0} sx={{ bgcolor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>Activities & Events</Typography>
            <Button size="small" sx={{ color: COLORS.green, textTransform: "none", fontWeight: 600, fontSize: "0.75rem" }}>View All</Button>
          </Box>
          <List sx={{ maxHeight: 220 }}>
            {data.events.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center", color: COLORS.textSecondary }}><Typography variant="body2">No upcoming events</Typography></Box>
            ) : (
              data.events.slice(0, 3).map((event: CalendarEvent, idx: number) => (
                <Box key={event.id}><ListItem sx={{ px: 0, py: 2 }}><ListItemText primary={<Typography variant="body2" fontWeight={600}>{event.title}</Typography>} secondary={<Typography variant="caption">{format(new Date(event.start_date), "MMMM dd, yyyy")}</Typography>} /></ListItem>{idx < data.events.length - 1 && <Divider />}</Box>
              ))
            )}
          </List>
        </Card>

        {/* Top Performance */}
        <Card elevation={0} sx={{ bgcolor: COLORS.cardBg, border: `1px solid ${COLORS.border}`, p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 3 }}>Top Performance</Typography>
          {topPerformers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: COLORS.textSecondary }}><Typography variant="body2">No performance data</Typography></Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {topPerformers.map((performer: any) => (
                <Card key={performer.rank} elevation={0} sx={{ bgcolor: performer.color, color: "white", textAlign: "center", p: 2.5, borderRadius: 3 }}>
                  <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 1.5, bgcolor: "rgba(255,255,255,0.3)", fontSize: "1.5rem", fontWeight: 700 }}>{performer.rank}</Avatar>
                  <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5, fontSize: "0.7rem" }}>{performer.name.substring(0, 15)}</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>{performer.score.toFixed(2)}%</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: "0.7rem" }}>{performer.rank === 1 ? "1st" : performer.rank === 2 ? "2nd" : "3rd"}</Typography>
                </Card>
              ))}
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}
