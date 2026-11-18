import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import {
  Campaign,
  Groups,
  School,
  ViewModule,
} from "@mui/icons-material";
import { format } from "date-fns";

import { useAppSelector } from "../../app/hooks";
import {
  getClasses,
  getSections,
  getSubjects,
  getTimeSlots,
  getTimetable,
  type SchoolClass,
  type Section,
  type Subject,
  type TimeSlot,
  type TimetableEntry,
} from "../../api/academic";
import { getStudents } from "../../api/people";
import { getExams, getExamSchedules, type Exam, type ExamSchedule } from "../../api/exams";
import { getActiveNotices } from "../../api/notices";
import { listStaff, type Staff } from "../../api/staffManagement";

const COLORS = {
  blue: "#1976D2",
  green: "#2E7D32",
  orange: "#ED6C02",
  purple: "#7E57C2",
  bg: "#F5F7FB",
  border: "#E2E8F0",
  text: "#1F2937",
  muted: "#64748B",
};

type MetricCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  loading: boolean;
};

function MetricCard({ label, value, icon, color, loading }: MetricCardProps) {
  return (
    <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ bgcolor: `${color}20`, color }}>{icon}</Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {loading ? (
            <CircularProgress size={22} />
          ) : (
            <Typography variant="h4" fontWeight={800}>
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function dayIndexForToday() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatTime(value?: string | null) {
  if (!value) return "Time TBD";
  const [hourValue, minuteValue = "00"] = value.split(":");
  let hour = Number(hourValue);
  if (!Number.isFinite(hour)) return value;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minuteValue.padStart(2, "0")} ${ampm}`;
}

export default function TeacherDashboardPage() {
  const email = useAppSelector((s) => s.auth.email);
  const memberships = useAppSelector((s) => s.auth.memberships);
  const activeSchoolId = useAppSelector((s) => s.auth.activeSchoolId);
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [noticeCount, setNoticeCount] = useState(0);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [slots, setSlots] = useState<Record<string, TimeSlot>>({});
  const [sectionMap, setSectionMap] = useState<Record<string, Section>>({});
  const [exams, setExams] = useState<Record<string, Exam>>({});
  const [todaySchedules, setTodaySchedules] = useState<ExamSchedule[]>([]);

  const schoolName =
    memberships.find((item) => item.school_id === activeSchoolId)?.school_name ||
    "Teacher Portal";

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const today = dayIndexForToday();
        const todayDate = format(new Date(), "yyyy-MM-dd");
        const staffResult = email
          ? await listStaff({ search: email, limit: 1, status: "active" }).catch(() => null)
          : null;
        const staffItems =
          staffResult && staffResult.ok && staffResult.data
            ? staffResult.data.items || []
            : [];
        const teacherStaff = staffItems.find(
          (staff: Staff) => staff.email?.toLowerCase() === email?.toLowerCase(),
        );

        const [
          studentResult,
          classList,
          activeNotices,
          subjectList,
          slotList,
          timetableRows,
          examList,
          scheduleList,
        ] = await Promise.all([
          getStudents({ limit: 1, status: "active" }).catch(() => ({
            total: 0,
            items: [],
            page: 1,
            limit: 1,
          })),
          getClasses().catch(() => []),
          getActiveNotices().catch(() => []),
          getSubjects().catch(() => []),
          getTimeSlots().catch(() => []),
          getTimetable({
            day_of_week: today,
            staff_id: teacherStaff?.id,
          }).catch(() => []),
          getExams().catch(() => []),
          getExamSchedules().catch(() => []),
        ]);

        const activeClasses = classList.filter((item) => item.is_active);
        const sectionLists = await Promise.all(
          activeClasses.map((item) => getSections(item.id).catch(() => [])),
        );
        const allSections = sectionLists.flat().filter((item) => item.is_active);

        if (!active) return;

        setTotalStudents(studentResult.total || 0);
        setClasses(activeClasses);
        setSections(allSections);
        setNoticeCount(activeNotices.length);
        setSubjects(
          subjectList.reduce<Record<string, Subject>>((acc, subject) => {
            acc[subject.id] = subject;
            return acc;
          }, {}),
        );
        setSlots(
          slotList.reduce<Record<string, TimeSlot>>((acc, slot) => {
            acc[slot.id] = slot;
            return acc;
          }, {}),
        );
        setSectionMap(
          allSections.reduce<Record<string, Section>>((acc, section) => {
            acc[section.id] = section;
            return acc;
          }, {}),
        );
        setTimetable(timetableRows);
        setExams(
          examList.reduce<Record<string, Exam>>((acc, exam) => {
            acc[exam.id] = exam;
            return acc;
          }, {}),
        );
        setTodaySchedules(
          scheduleList.filter((schedule) => schedule.exam_date === todayDate),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [activeSchoolId, email]);

  const sortedTimetable = useMemo(() => {
    return [...timetable].sort((a, b) => {
      const aSlot = slots[a.time_slot_id];
      const bSlot = slots[b.time_slot_id];
      return (aSlot?.start_time || "").localeCompare(bSlot?.start_time || "");
    });
  }, [slots, timetable]);

  const sortedSchedules = useMemo(() => {
    return [...todaySchedules].sort((a, b) =>
      (a.start_time || "").localeCompare(b.start_time || ""),
    );
  }, [todaySchedules]);

  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: "100vh", p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} color={COLORS.text}>
          Teacher Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {schoolName} - {format(new Date(), "EEEE, MMMM dd")}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <MetricCard
          label="Total Students"
          value={totalStudents}
          icon={<Groups />}
          color={COLORS.blue}
          loading={loading}
        />
        <MetricCard
          label="Total Class"
          value={classes.length}
          icon={<School />}
          color={COLORS.green}
          loading={loading}
        />
        <MetricCard
          label="Total Sections"
          value={sections.length}
          icon={<ViewModule />}
          color={COLORS.purple}
          loading={loading}
        />
        <MetricCard
          label="Today Notice"
          value={noticeCount}
          icon={<Campaign />}
          color={COLORS.orange}
          loading={loading}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.2fr 0.8fr" },
          gap: 3,
        }}
      >
        <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} mb={2}>
              Today&apos;s Timetable
            </Typography>
            {loading ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : sortedTimetable.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No timetable scheduled for today.
              </Typography>
            ) : (
              <List disablePadding>
                {sortedTimetable.map((entry) => {
                  const subject = entry.subject_id ? subjects[entry.subject_id] : null;
                  const slot = slots[entry.time_slot_id];
                  const section = sectionMap[entry.section_id];
                  return (
                    <ListItem
                      key={entry.id}
                      sx={{
                        px: 0,
                        py: 1.5,
                        borderBottom: `1px solid ${COLORS.border}`,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={800}>
                          {subject?.name || "Subject"}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: "wrap" }}>
                          <Chip size="small" label={section?.name || "Section"} />
                          <Chip size="small" label={entry.room || "Room TBD"} variant="outlined" />
                        </Stack>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color={COLORS.blue}>
                        {formatTime(slot?.start_time)} - {formatTime(slot?.end_time)}
                      </Typography>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} mb={2}>
              Today&apos;s Exams
            </Typography>
            {loading ? (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <CircularProgress />
              </Box>
            ) : sortedSchedules.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No exams scheduled for today.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {sortedSchedules.map((schedule) => {
                  const exam = exams[schedule.exam_id];
                  const subject = subjects[schedule.subject_id];
                  return (
                    <Box
                      key={schedule.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: "#FFFFFF",
                      }}
                    >
                      <Typography variant="body2" fontWeight={800}>
                        {exam?.name || "Exam"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {subject?.name || "Subject"} - {formatTime(schedule.start_time)} to{" "}
                        {formatTime(schedule.end_time)}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
