import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  Paper,
  Avatar,
  IconButton,
} from "@mui/material";
import {
  People,
  School,
  AttachMoney,
  EventAvailable,
  TrendingUp,
  TrendingDown,
  MoreVert,
} from "@mui/icons-material";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { setActiveSchoolId } from "../features/auth/authSlice";
import {
  getAdminDashboard,
  getAttendanceStats,
  type AdminDashboardData,
  type AttendanceStats,
} from "../api/analytics";

// Mock data for visualization
const attendanceTrend = [
  { name: "Mon", students: 95, staff: 98 },
  { name: "Tue", students: 93, staff: 97 },
  { name: "Wed", students: 96, staff: 98 },
  { name: "Thu", students: 94, staff: 96 },
  { name: "Fri", students: 92, staff: 95 },
  { name: "Sat", students: 85, staff: 90 },
  { name: "Sun", students: 0, staff: 0 },
];

const revenueData = [
  { name: "Jan", collected: 15000, due: 2400 },
  { name: "Feb", collected: 18000, due: 1398 },
  { name: "Mar", collected: 12000, due: 9800 },
  { name: "Apr", collected: 21000, due: 3908 },
  { name: "May", collected: 19000, due: 4800 },
  { name: "Jun", collected: 23000, due: 3800 },
];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend: number;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  return (
    <Card sx={{ height: "100%", borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography
              color="text.secondary"
              gutterBottom
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "0.75rem",
                letterSpacing: 0.5,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, my: 1, color: "#1a1a1a" }}
            >
              {value}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {trend > 0 ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="caption"
                color={trend > 0 ? "success.main" : "error.main"}
                fontWeight="bold"
              >
                {Math.abs(trend)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                vs last month
              </Typography>
            </Box>
          </Box>
          <Avatar
            sx={{ bgcolor: color, width: 56, height: 56, borderRadius: 2 }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const memberships = useAppSelector((s) => s.auth.memberships);
  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId);

  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeSchoolId) return;

    async function load() {
      setLoading(true);
      try {
        const [dash, att] = await Promise.all([
          getAdminDashboard(),
          getAttendanceStats().catch(() => null),
        ]);
        setDashboard(dash);
        setAttendance(att);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeSchoolId]);

  if (loading && !dashboard) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  const attendanceTotal =
    (attendance?.student_records ?? 0) + (attendance?.staff_records ?? 0);

  return (
    <Box>
      {/* Header Section */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: "#2c3e50" }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back! Here's what's happening today.
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Active School</InputLabel>
          <Select
            value={activeSchoolId ?? ""}
            label="Active School"
            onChange={(e) =>
              dispatch(setActiveSchoolId(e.target.value || null))
            }
            sx={{ borderRadius: 2, bgcolor: "background.paper" }}
          >
            {memberships.map((m) => (
              <MenuItem key={m.school_id} value={m.school_id}>
                {m.school_name || m.school_id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Students"
            value={dashboard?.students ?? 0}
            icon={<School fontSize="large" sx={{ color: "#fff" }} />}
            color="#3f51b5"
            trend={12.5}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Teachers"
            value={dashboard?.staff ?? 0}
            icon={<People fontSize="large" sx={{ color: "#fff" }} />}
            color="#009688"
            trend={2.4}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Financial Due"
            value={`$${(dashboard?.total_due_amount ?? 0).toLocaleString()}`}
            icon={<AttachMoney fontSize="large" sx={{ color: "#fff" }} />}
            color="#f44336"
            trend={-5.3}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Attendance Records"
            value={attendanceTotal.toLocaleString()}
            icon={<EventAvailable fontSize="large" sx={{ color: "#fff" }} />}
            color="#ff9800"
            trend={8.1}
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: 400 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h6" fontWeight="bold">
                Revenue Overview
              </Typography>
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            </Box>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient
                    id="colorCollected"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3f51b5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f44336" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#3f51b5"
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                  name="Collected"
                />
                <Area
                  type="monotone"
                  dataKey="due"
                  stroke="#f44336"
                  fillOpacity={1}
                  fill="url(#colorDue)"
                  name="Due"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: 400 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h6" fontWeight="bold">
                Attendance Rate (%)
              </Typography>
              <IconButton size="small">
                <MoreVert />
              </IconButton>
            </Box>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={attendanceTrend}>
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar
                  dataKey="students"
                  fill="#009688"
                  radius={[4, 4, 0, 0]}
                  name="Students"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
