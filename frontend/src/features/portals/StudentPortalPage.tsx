import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Assignment,
  Campaign,
  Dashboard,
  Event,
  Payments,
  Person,
  Schedule,
  School,
} from "@mui/icons-material";
import { format } from "date-fns";

import PortalLayout, { type PortalTab } from "./PortalLayout";
import {
  getStudentSelfProfile,
  getStudentSelfAttendance,
  getStudentSelfAttendanceSummary,
  getStudentSelfFeeDues,
  getStudentSelfFeePayments,
  getStudentSelfGuardians,
  getStudentSelfTimetable,
  getStudentSelfNotices,
  type PortalStudent as Student,
  type PortalAttendanceRecord as StudentAttendanceRecord,
  type PortalFeeDue as FeeDue,
  type PortalFeePayment as FeePayment,
  type PortalTimetableEntry as StudentTimetableEntry,
  type PortalGuardian,
  type PortalNotice,
} from "../../api/portal";
import { showToast } from "../../app/toast";
import { formatMoney } from "../finance/financeUtils";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PortalTabId =
  | "overview"
  | "attendance"
  | "timetable"
  | "fees"
  | "results"
  | "notices"
  | "profile";

const tabs: PortalTab[] = [
  { id: "overview", label: "Overview", icon: <Dashboard /> },
  { id: "attendance", label: "Attendance", icon: <Assignment /> },
  { id: "timetable", label: "Timetable", icon: <Schedule /> },
  { id: "fees", label: "Fees", icon: <Payments /> },
  { id: "results", label: "Results", icon: <School /> },
  { id: "notices", label: "Notices", icon: <Campaign /> },
  { id: "profile", label: "Profile", icon: <Person /> },
];

export default function StudentPortalPage() {
  const [activeTab, setActiveTab] = useState<PortalTabId>("overview");
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<
    string,
    number
  > | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    StudentAttendanceRecord[]
  >([]);
  const [timetable, setTimetable] = useState<StudentTimetableEntry[]>([]);
  const [feeDues, setFeeDues] = useState<FeeDue[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [guardians, setGuardians] = useState<PortalGuardian[]>([]);
  const [notices, setNotices] = useState<PortalNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const studentName = useMemo(() => {
    if (!student) return "Student Portal";
    return [student.first_name, student.last_name].filter(Boolean).join(" ");
  }, [student]);

  const attendanceTotals = useMemo(() => {
    const summary: Record<string, number> = attendanceSummary || {};
    const entries = Object.entries(summary);
    const total = entries.reduce((acc: number, [, v]) => acc + (v || 0), 0);
    return { summary, total };
  }, [attendanceSummary]);

  const totalDue = useMemo(
    () => feeDues.reduce((acc: number, due: FeeDue) => acc + (due.due_amount || 0), 0),
    [feeDues],
  );

  const totalPaid = useMemo(
    () =>
      feePayments
        .filter((p: FeePayment) => !p.is_refund)
        .reduce((acc: number, p: FeePayment) => acc + (p.amount || 0), 0),
    [feePayments],
  );

  const todayIndex = useMemo(() => (new Date().getDay() + 6) % 7, []);

  const todaysTimetable = useMemo(() => {
    return timetable
      .filter((t: StudentTimetableEntry) => t.day_of_week === todayIndex)
      .sort((a: StudentTimetableEntry, b: StudentTimetableEntry) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [timetable, todayIndex]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    (async () => {
      try {
        const [profile, summary, records, table, dues, payments, guardianData, noticeData] =
          await Promise.all([
            getStudentSelfProfile(),
            getStudentSelfAttendanceSummary().catch(() => ({})),
            getStudentSelfAttendance().catch(() => []),
            getStudentSelfTimetable().catch(() => []),
            getStudentSelfFeeDues().catch(() => []),
            getStudentSelfFeePayments().catch(() => []),
            getStudentSelfGuardians().catch(() => []),
            getStudentSelfNotices().catch(() => []),
          ]);
        if (!active) return;
        setStudent(profile);
        setAttendanceSummary(summary);
        setAttendanceRecords(records);
        setTimetable(table);
        setFeeDues(dues);
        setFeePayments(payments);
        setGuardians(guardianData);
        setNotices(noticeData);
      } catch {
        if (active) showToast({ severity: "error", message: "Failed to load student portal" });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  const headerSubtitle = student
    ? `${student.admission_no || "Admission"} • ${student.status}`
    : "Access your academic information and updates";

  const renderOverview = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                <Assignment />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Attendance Rate
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {attendanceTotals.total
                    ? `${Math.round(
                        ((attendanceTotals.summary.present || 0) /
                          attendanceTotals.total) *
                          100,
                      )}%`
                    : "—"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "success.light", color: "success.main" }}>
                <Payments />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Outstanding Fees
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formatMoney(totalDue)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: "warning.light", color: "warning.main" }}>
                <Event />
              </Avatar>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Notices
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {notices.length}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Today&apos;s Classes
            </Typography>
            {todaysTimetable.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No classes scheduled for today.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {todaysTimetable.slice(0, 4).map((entry: StudentTimetableEntry) => (
                  <Box
                    key={entry.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {entry.subject_id || "Subject"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Room {entry.room || "TBD"}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {entry.start_time} - {entry.end_time}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Recent Payments
            </Typography>
            {feePayments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No payments recorded yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {feePayments.slice(0, 4).map((payment: FeePayment) => (
                  <Box
                    key={payment.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid #E2E8F0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {formatMoney(payment.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {payment.payment_method || "Payment"}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAttendance = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Attendance Summary
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {Object.entries(attendanceTotals.summary).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Attendance summary not available.
              </Typography>
            ) : (
              Object.entries(attendanceTotals.summary).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${value}`}
                  color={key === "present" ? "success" : "default"}
                  variant={key === "absent" ? "outlined" : "filled"}
                />
              ))
            )}
          </Stack>
        </CardContent>
      </Card>
      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Attendance Records
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>
                      <Typography variant="body2" color="text.secondary">
                        No attendance records found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceRecords.slice(0, 12).map((record: StudentAttendanceRecord) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(
                          new Date(record.attendance_date),
                          "MMM dd, yyyy",
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          size="small"
                          color={
                            record.status === "present" ? "success" : "default"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderTimetable = () => (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Weekly Timetable
        </Typography>
        {timetable.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Timetable not available yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Room</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timetable.map((entry: StudentTimetableEntry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {dayLabels[entry.day_of_week] || "Day"}
                    </TableCell>
                    <TableCell>
                      {entry.start_time} - {entry.end_time}
                    </TableCell>
                    <TableCell>{entry.subject_id || "Subject"}</TableCell>
                    <TableCell>{entry.room || "TBD"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  const renderFees = () => (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Due
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {formatMoney(totalDue)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Total Paid: {formatMoney(totalPaid)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            elevation={0}
            sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Payment History
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {feePayments.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Records available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Fee Dues
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Last Calculated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feeDues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary">
                        No fee dues available.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  feeDues.map((due: FeeDue) => (
                    <TableRow key={due.id}>
                      <TableCell>
                        <Chip label={due.status} size="small" />
                      </TableCell>
                      <TableCell>{formatMoney(due.total_fee)}</TableCell>
                      <TableCell>{formatMoney(due.paid_amount)}</TableCell>
                      <TableCell>{formatMoney(due.due_amount)}</TableCell>
                      <TableCell>
                        {due.last_calculated_date
                          ? format(new Date(due.last_calculated_date), "MMM dd, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Fee Payments
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feePayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No payments found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  feePayments.map((payment: FeePayment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method || "—"}</TableCell>
                      <TableCell>{payment.reference || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );

  const renderResults = () => (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Exam Results
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Results will appear here once published by the school.
        </Typography>
      </CardContent>
    </Card>
  );

  const renderNotices = () => (
    <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Notices
        </Typography>
        {notices.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No notices available.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {notices.slice(0, 6).map((notice: PortalNotice) => (
              <Box
                key={notice.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #E2E8F0",
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {notice.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notice.published_at ? format(new Date(notice.published_at), "MMM dd, yyyy") : ""}
                </Typography>
                <Typography variant="body2" mt={1}>
                  {notice.content || "No details provided."}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  const renderProfile = () => (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main" }}>
              {student?.first_name?.[0] || "S"}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {studentName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admission No: {student?.admission_no || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {student?.status || "—"}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Contact Information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{student?.email || "—"}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Phone
              </Typography>
              <Typography variant="body1">{student?.phone || "—"}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Address
              </Typography>
              <Typography variant="body1">
                {student?.present_address || "—"}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" color="text.secondary">
                Blood Group
              </Typography>
              <Typography variant="body1">
                {student?.blood_group || "—"}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Guardians
          </Typography>
          {guardians.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No guardians linked.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {guardians.map((g: PortalGuardian) => (
                <Box
                  key={g.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {g.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {g.relation}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2">
                      {g.phone || "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {g.email || "—"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  const renderContent = () => {
    if (activeTab === "attendance") return renderAttendance();
    if (activeTab === "timetable") return renderTimetable();
    if (activeTab === "fees") return renderFees();
    if (activeTab === "results") return renderResults();
    if (activeTab === "notices") return renderNotices();
    if (activeTab === "profile") return renderProfile();
    return renderOverview();
  };

  return (
    <PortalLayout
      brandTitle="Student Portal"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as PortalTabId)}
      tabs={tabs}
      headerTitle={studentName}
      headerSubtitle={headerSubtitle}
    >
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : !student ? (
        <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                Student record not linked
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your login is active, but your student record could not be found.
                Please contact your school administrator.
              </Typography>
              <Divider />
            </Stack>
          </CardContent>
        </Card>
      ) : (
        renderContent()
      )}
    </PortalLayout>
  );
}
