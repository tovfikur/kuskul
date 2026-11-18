import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
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
import { useAppSelector } from "../app/hooks";
import {
  getAdminDashboard,
  getPerformanceTrends,
  getUpcomingEvents,
  type AdminDashboardData,
  type PerformanceTrend,
  type Event as CalendarEvent,
} from "../api/analytics";
import {
  getTimetable,
  getSubjects,
  getTimeSlots,
  type TimetableEntry,
  type Subject,
  type TimeSlot,
} from "../api/academic";
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
  const memberships = useAppSelector((s) => s.auth.memberships);
  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    admin: AdminDashboardData | null;
    performance: PerformanceTrend[];
    events: CalendarEvent[];
    timetable: {
      entries: TimetableEntry[];
      subjects: Record<string, Subject>;
      slots: Record<string, TimeSlot>;
    };
  }>({ admin: null, performance: [], events: [], timetable: { entries: [], subjects: {}, slots: {} } });

  useEffect(() => {
    if (!activeSchoolId) return;
    loadData();
  }, [activeSchoolId]);

  async function loadData() {
    setLoading(true);
    try {
      // Timetable stores days as 0=Mon…6=Sun; JS getDay() returns 0=Sun…6=Sat
      const jsDay = new Date().getDay();
      const today = jsDay === 0 ? 6 : jsDay - 1;
      const [admin, perf, events, timetableEntries, allSubjects, allSlots] = await Promise.all([
        getAdminDashboard(),
        getPerformanceTrends().catch(() => []),
        getUpcomingEvents().catch(() => []),
        getTimetable({ day_of_week: today }).catch(() => []),
        getSubjects().catch(() => []),
        getTimeSlots().catch(() => []),
      ]);
      
      const subjectMap: Record<string, Subject> = {};
      allSubjects.forEach(s => subjectMap[s.id] = s);
      
      const slotMap: Record<string, TimeSlot> = {};
      allSlots.forEach(s => slotMap[s.id] = s);

      setData({ 
        admin, 
        performance: perf, 
        events,
        timetable: { entries: timetableEntries, subjects: subjectMap, slots: slotMap }
      });
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

  const topPerformers = data.performance.slice(0, 3).map((p, i) => ({
    name: p.exam_name,
    score: p.avg_pct,
    rank: i + 1,
    color: [COLORS.green, COLORS.purple, COLORS.yellow][i],
  }));

  // Group timetable entries by time slot
  const slotGroups: Record<string, TimetableEntry[]> = {};
  data.timetable.entries.forEach(entry => {
    if (!slotGroups[entry.time_slot_id]) {
      slotGroups[entry.time_slot_id] = [];
    }
    slotGroups[entry.time_slot_id].push(entry);
  });
  
  // Sort slots by start time
  const sortedSlotIds = Object.keys(slotGroups).sort((a, b) => {
    const slotA = data.timetable.slots[a];
    const slotB = data.timetable.slots[b];
    if (!slotA || !slotB) return 0;
    return slotA.start_time.localeCompare(slotB.start_time);
  });

  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
          Welcome to {schoolName}
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, mt: 0.5 }}>
          School Year {currentYear} – {currentYear + 1}
        </Typography>
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

          <Box sx={{ py: 2, textAlign: "left", maxHeight: 300, overflow: "auto" }}>
            {sortedSlotIds.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                 <Typography variant="body2" color="text.secondary">
                    No classes scheduled for today.
                 </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {sortedSlotIds.map((slotId, index) => {
                  const slot = data.timetable.slots[slotId];
                  const entries = slotGroups[slotId];
                  if (!slot) return null;
                  
                  // Format time to 12hr AM/PM for display
                  function formatTime(timeVal: string) {
                     if (!timeVal) return "";
                     const [hh, mm] = timeVal.split(":");
                     let h = parseInt(hh, 10);
                     const ampm = h >= 12 ? "PM" : "AM";
                     h = h % 12 || 12;
                     return `${h}:${mm} ${ampm}`;
                  }
                  
                  return (
                    <Box key={slotId}>
                      <ListItem sx={{ px: 0, py: 1.5, flexDirection: "column", alignItems: "flex-start" }}>
                        <Typography variant="caption" sx={{ color: COLORS.purple, fontWeight: 700, mb: 0.5 }}>
                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, width: "100%" }}>
                          {entries.map(entry => {
                             const subject = entry.subject_id ? data.timetable.subjects[entry.subject_id] : null;
                             return (
                               <Box key={entry.id} sx={{ bgcolor: COLORS.bg, borderRadius: 1.5, px: 1.5, py: 1, border: `1px solid ${COLORS.border}`, flex: "1 1 calc(50% - 8px)" }}>
                                 <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                                   {subject ? subject.name : "Unassigned Subject"}
                                 </Typography>
                                 {entry.room && (
                                   <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: "block" }}>
                                     Room: {entry.room}
                                   </Typography>
                                 )}
                               </Box>
                             );
                          })}
                        </Box>
                      </ListItem>
                      {index < sortedSlotIds.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </List>
            )}
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
            <Box sx={{ flex: 1, minWidth: 0, height: 300, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="stage" hide />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {stageData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
              {topPerformers.map((performer) => (
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
