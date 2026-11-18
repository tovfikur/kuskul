import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Campaign,
  Dashboard,
  Payments,
  Person,
  Schedule,
  SupervisorAccount,
} from "@mui/icons-material";
import { format } from "date-fns";

import PortalLayout, { type PortalTab } from "./PortalLayout";
import {
  getParentProfile,
  getParentChildren,
  getParentChildAttendance,
  getParentChildTimetable,
  getParentChildFees,
  getParentNotices,
  type ParentProfile,
  type ChildStudent,
  type PortalTimetableEntry as TimetableEntry,
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
  | "notices"
  | "profile";

const tabs: PortalTab[] = [
  { id: "overview", label: "Overview", icon: <Dashboard /> },
  { id: "attendance", label: "Attendance", icon: <SupervisorAccount /> },
  { id: "timetable", label: "Timetable", icon: <Schedule /> },
  { id: "fees", label: "Fees", icon: <Payments /> },
  { id: "notices", label: "Notices", icon: <Campaign /> },
  { id: "profile", label: "Profile", icon: <Person /> },
];

export default function GuardianPortalPage() {
  const [activeTab, setActiveTab] = useState<PortalTabId>("overview");
  const [guardian, setGuardian] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<ChildStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ChildStudent | null>(null);
  
  const [attendanceRecords, setAttendanceRecords] = useState<{date: string, status: string}[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [feeData, setFeeData] = useState<{due_amount: number; paid_amount: number; history: any[]}>({
    due_amount: 0,
    paid_amount: 0,
    history: []
  });
  const [notices, setNotices] = useState<PortalNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const guardianName = guardian?.full_name || "Guardian Portal";

  const attendanceSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    attendanceRecords.forEach((r: { date: string; status: string }) => {
      summary[r.status] = (summary[r.status] || 0) + 1;
    });
    const total = attendanceRecords.length;
    return { summary, total };
  }, [attendanceRecords]);

  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      setLoading(true);
      try {
        const [profile, kids, noticeData] = await Promise.all([
          getParentProfile(),
          getParentChildren(),
          getParentNotices().catch(() => [])
        ]);
        if (!active) return;
        setGuardian(profile);
        setChildren(kids);
        setNotices(noticeData);
        if (kids.length > 0) {
          setSelectedStudent(kids[0]);
        }
      } catch {
        if (active) showToast({ severity: "error", message: "Failed to load portal data" });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadStudentData(studentId: string) {
      const now = new Date();
      const [records, table, fees] = await Promise.all([
        getParentChildAttendance(studentId, now.getMonth() + 1, now.getFullYear()).catch(() => []),
        getParentChildTimetable(studentId).catch(() => []),
        getParentChildFees(studentId).catch(() => ({ due_amount: 0, paid_amount: 0, history: [] })),
      ]);

      if (!active) return;
      setAttendanceRecords(records);
      setTimetable(table);
      setFeeData(fees);
    }

    if (selectedStudent) {
      loadStudentData(selectedStudent.id).catch(() => {
        showToast({
          severity: "error",
          message: "Failed to load student data",
        });
      });
    } else {
      setAttendanceRecords([]);
      setTimetable([]);
      setFeeData({ due_amount: 0, paid_amount: 0, history: [] });
    }

    return () => {
      active = false;
    };
  }, [selectedStudent]);

  const headerSubtitle = selectedStudent
    ? `${selectedStudent.first_name} ${selectedStudent.last_name || ""}`
    : "Monitor student progress and payments";

  const renderOverview = () => (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Selected Student
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {selectedStudent
                ? `${selectedStudent.first_name} ${selectedStudent.last_name || ""}`
                : "None"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Outstanding Fees
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatMoney(feeData.due_amount)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Notices
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {notices.length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Select Student
            </Typography>
            <Autocomplete
              options={children}
              value={selectedStudent}
              getOptionLabel={(option: ChildStudent) =>
                `${option.first_name} ${option.last_name || ""}`
              }
              onChange={(_: React.SyntheticEvent, value: ChildStudent | null) => setSelectedStudent(value)}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Select a managed student"
                  fullWidth
                />
              )}
            />
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
            {Object.entries(attendanceSummary.summary).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No attendance for this month.
              </Typography>
            ) : (
              Object.entries(attendanceSummary.summary).map(([key, value]) => (
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
                  attendanceRecords.slice(0, 12).map((record: { date: string; status: string }) => (
                    <TableRow key={record.date + record.status}>
                      <TableCell>
                        {format(
                          new Date(record.date),
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
                {timetable.map((entry: TimetableEntry) => (
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
                {formatMoney(feeData.due_amount)}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Total Paid: {formatMoney(feeData.paid_amount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                </TableRow>
              </TableHead>
              <TableBody>
                {feeData.history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">
                        No payments found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  feeData.history.map((payment: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.method || "—"}</TableCell>
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
              {guardian?.full_name?.[0] || "G"}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                {guardian?.full_name || "Guardian"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: {guardian?.email || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: {guardian?.phone || "—"}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid #E2E8F0" }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} mb={2}>
            Selected Student
          </Typography>
          {selectedStudent ? (
            <Stack spacing={1}>
              <Typography variant="body1" fontWeight={600}>
                {selectedStudent.first_name} {selectedStudent.last_name || ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admission No: {selectedStudent.admission_no || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {selectedStudent.status || "—"}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a student to view their profile.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );

  const renderContent = () => {
    if (activeTab === "attendance") return renderAttendance();
    if (activeTab === "timetable") return renderTimetable();
    if (activeTab === "fees") return renderFees();
    if (activeTab === "notices") return renderNotices();
    if (activeTab === "profile") return renderProfile();
    return renderOverview();
  };

  return (
    <PortalLayout
      brandTitle="Guardian Portal"
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as PortalTabId)}
      tabs={tabs}
      headerTitle={guardianName}
      headerSubtitle={headerSubtitle}
    >
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        renderContent()
      )}
    </PortalLayout>
  );
}
