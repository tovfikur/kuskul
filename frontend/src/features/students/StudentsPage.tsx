import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add,
  Download,
  MoreVert,
  Refresh,
  Search,
  UploadFile,
} from "@mui/icons-material";
import {
  getClasses,
  getSections,
  type SchoolClass,
  type Section,
} from "../../api/academic";
import {
  bulkImportStudentsCsv,
  createStudent,
  deleteStudent,
  downloadStudentIdCard,
  exportStudentsCsv,
  getStudent,
  getStudentAttendance,
  getStudentAttendanceSummary,
  getStudentFeeDues,
  getStudentFeePayments,
  getStudentTimetable,
  getStudents,
  updateStudent,
  type FeeDue,
  type FeePayment,
  type Student,
  type StudentAttendanceRecord,
  type StudentTimetableEntry,
} from "../../api/people";
import { showToast } from "../../app/toast";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatStudentName(s: Student) {
  return [s.first_name, s.last_name || ""].filter(Boolean).join(" ").trim();
}

function statusChipColor(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "inactive") return "default";
  if (s === "suspended") return "warning";
  if (s === "alumni") return "info";
  return "default";
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null);
  const [actionsStudent, setActionsStudent] = useState<Student | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogSaving, setDialogSaving] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    first_name: string;
    last_name: string;
    admission_no: string;
    gender: string;
    date_of_birth: string;
    status: string;
  }>({
    first_name: "",
    last_name: "",
    admission_no: "",
    gender: "",
    date_of_birth: "",
    status: "active",
  });

  const [drawerStudentId, setDrawerStudentId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState(0);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<
    string,
    number
  > | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    StudentAttendanceRecord[] | null
  >(null);
  const [feeDues, setFeeDues] = useState<FeeDue[] | null>(null);
  const [feePayments, setFeePayments] = useState<FeePayment[] | null>(null);
  const [timetable, setTimetable] = useState<StudentTimetableEntry[] | null>(
    null
  );

  const dateRange30d = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start_date: isoDate(start), end_date: isoDate(end) };
  }, []);

  const filteredCounts = useMemo(() => {
    const active = students.filter(
      (s) => s.status?.toLowerCase() === "active"
    ).length;
    const inactive = students.filter(
      (s) => s.status?.toLowerCase() === "inactive"
    ).length;
    return { active, inactive };
  }, [students]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({
        page: page + 1,
        limit: rowsPerPage,
        search: search.trim() || undefined,
        status: status || undefined,
        gender: gender || undefined,
        class_id: classId || undefined,
        section_id: sectionId || undefined,
      });
      setStudents(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  }, [classId, gender, page, rowsPerPage, search, sectionId, status]);

  useEffect(() => {
    async function load() {
      try {
        const list = await getClasses();
        setClasses(list.filter((c) => c.is_active));
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [search, status, gender, classId, sectionId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    async function load() {
      if (!classId) {
        setSections([]);
        setSectionId("");
        return;
      }
      try {
        const list = await getSections(classId);
        setSections(list.filter((s) => s.is_active));
        if (sectionId && !list.some((s) => s.id === sectionId)) {
          setSectionId("");
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [classId, sectionId]);

  async function openDrawer(studentId: string) {
    setDrawerStudentId(studentId);
    setDrawerTab(0);
    setDrawerStudent(null);
    setAttendanceSummary(null);
    setAttendanceRecords(null);
    setFeeDues(null);
    setFeePayments(null);
    setTimetable(null);
    setDrawerLoading(true);
    try {
      const s = await getStudent(studentId);
      setDrawerStudent(s);
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerLoading(false);
    }
  }

  useEffect(() => {
    async function loadTabData() {
      if (!drawerStudentId) return;
      if (drawerTab === 1 && (!attendanceSummary || !attendanceRecords)) {
        try {
          const [summary, records] = await Promise.all([
            getStudentAttendanceSummary(drawerStudentId, dateRange30d).catch(
              () => null
            ),
            getStudentAttendance(drawerStudentId, dateRange30d).catch(
              () => null
            ),
          ]);
          setAttendanceSummary(summary);
          setAttendanceRecords(records);
        } catch (e) {
          console.error(e);
        }
      }
      if (drawerTab === 2 && (!feeDues || !feePayments)) {
        try {
          const [dues, payments] = await Promise.all([
            getStudentFeeDues(drawerStudentId).catch(() => null),
            getStudentFeePayments(drawerStudentId).catch(() => null),
          ]);
          setFeeDues(dues);
          setFeePayments(payments);
        } catch (e) {
          console.error(e);
        }
      }
      if (drawerTab === 3 && !timetable) {
        try {
          const tt = await getStudentTimetable(drawerStudentId).catch(
            () => null
          );
          setTimetable(tt);
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadTabData();
  }, [
    attendanceRecords,
    attendanceSummary,
    dateRange30d,
    drawerStudentId,
    drawerTab,
    feeDues,
    feePayments,
    timetable,
  ]);

  function openCreateDialog() {
    setDialogMode("create");
    setEditingStudentId(null);
    setForm({
      first_name: "",
      last_name: "",
      admission_no: "",
      gender: "",
      date_of_birth: "",
      status: "active",
    });
    setDialogOpen(true);
  }

  function openEditDialog(s: Student) {
    setDialogMode("edit");
    setEditingStudentId(s.id);
    setForm({
      first_name: s.first_name ?? "",
      last_name: s.last_name ?? "",
      admission_no: s.admission_no ?? "",
      gender: s.gender ?? "",
      date_of_birth: s.date_of_birth ?? "",
      status: s.status ?? "active",
    });
    setDialogOpen(true);
  }

  async function handleSaveStudent() {
    if (!form.first_name.trim()) {
      showToast({ severity: "error", message: "First name is required" });
      return;
    }
    setDialogSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        admission_no: form.admission_no.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        status: form.status || "active",
      };
      if (dialogMode === "create") {
        await createStudent(payload);
      } else if (editingStudentId) {
        await updateStudent(editingStudentId, payload);
      }
      setDialogOpen(false);
      loadStudents();
    } catch (e) {
      console.error(e);
    } finally {
      setDialogSaving(false);
    }
  }

  async function handleDeactivateStudent(s: Student) {
    try {
      await updateStudent(s.id, { status: "inactive" });
      loadStudents();
      if (drawerStudentId === s.id) {
        const updated = await getStudent(s.id);
        setDrawerStudent(updated);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteStudent(s: Student) {
    const ok = window.confirm(`Delete ${formatStudentName(s)}?`);
    if (!ok) return;
    try {
      await deleteStudent(s.id);
      if (drawerStudentId === s.id) {
        setDrawerStudentId(null);
      }
      loadStudents();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleExportCsv() {
    try {
      const blob = await exportStudentsCsv();
      downloadBlob(blob, "students.csv");
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImportCsv(file: File) {
    try {
      const res = await bulkImportStudentsCsv(file);
      showToast({
        severity: "success",
        message: `Imported ${res.created} students`,
      });
      setPage(0);
      loadStudents();
    } catch (e) {
      console.error(e);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownloadIdCard(s: Student) {
    try {
      const blob = await downloadStudentIdCard(s.id);
      downloadBlob(blob, `id_card_${s.id}.txt`);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="800" sx={{ color: "#2c3e50" }}>
            Students
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Admissions, attendance, fees, and academic operations in one place.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportCsv(f);
            }}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFile />}
            onClick={() => fileInputRef.current?.click()}
          >
            Bulk Import CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadStudents()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
          >
            Add Student
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Total Results
            </Typography>
            <Typography variant="h5" fontWeight={800}>
              {total.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="overline" color="text.secondary">
              On This Page
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h5" fontWeight={800}>
                {students.length.toLocaleString()}
              </Typography>
              <Chip
                label={`Active: ${filteredCounts.active}`}
                color="success"
                size="small"
              />
              <Chip
                label={`Inactive: ${filteredCounts.inactive}`}
                size="small"
              />
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Quick Actions
            </Typography>
            <Typography color="text.secondary">
              Open a student to manage fees, attendance, and timetable.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or admission no"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select
                value={classId}
                label="Class"
                onChange={(e) => setClassId(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small" disabled={!classId}>
              <InputLabel>Section</InputLabel>
              <Select
                value={sectionId}
                label="Section"
                onChange={(e) => setSectionId(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="alumni">Alumni</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select
                value={gender}
                label="Gender"
                onChange={(e) => setGender(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Admission No</TableCell>
                    <TableCell>Student</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>DOB</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      onDoubleClick={() => openDrawer(row.id)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>{row.admission_no || "-"}</TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>
                          {formatStudentName(row) || "-"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {row.id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>
                        {row.gender || "-"}
                      </TableCell>
                      <TableCell>{row.date_of_birth || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={(row.status || "-").toUpperCase()}
                          color={statusChipColor(row.status || "")}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="More">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionsAnchor(e.currentTarget);
                              setActionsStudent(row);
                            }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ py: 6, textAlign: "center" }}
                      >
                        <Typography fontWeight={700}>
                          No students found
                        </Typography>
                        <Typography color="text.secondary">
                          Try adjusting filters or import students in bulk.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, next) => {
                setPage(next);
              }}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                const next = parseInt(e.target.value, 10);
                setRowsPerPage(next);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
            />
          </>
        )}
      </Paper>

      <Menu
        open={Boolean(actionsAnchor)}
        anchorEl={actionsAnchor}
        onClose={() => {
          setActionsAnchor(null);
          setActionsStudent(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (actionsStudent) openDrawer(actionsStudent.id);
            setActionsAnchor(null);
          }}
        >
          View / Manage
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) openEditDialog(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) handleDownloadIdCard(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Download ID Card
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={
            !actionsStudent || actionsStudent.status?.toLowerCase() !== "active"
          }
          onClick={() => {
            if (actionsStudent) handleDeactivateStudent(actionsStudent);
            setActionsAnchor(null);
          }}
        >
          Deactivate
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionsStudent) handleDeleteStudent(actionsStudent);
            setActionsAnchor(null);
          }}
          sx={{ color: "error.main" }}
        >
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialogMode === "create" ? "Add Student" : "Edit Student"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="First Name"
                fullWidth
                margin="normal"
                value={form.first_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, first_name: e.target.value }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Last Name"
                fullWidth
                margin="normal"
                value={form.last_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, last_name: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Admission No"
                fullWidth
                margin="normal"
                value={form.admission_no}
                onChange={(e) =>
                  setForm((p) => ({ ...p, admission_no: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Gender</InputLabel>
                <Select
                  value={form.gender}
                  label="Gender"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, gender: e.target.value }))
                  }
                >
                  <MenuItem value="">Unspecified</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date_of_birth: e.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="alumni">Alumni</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveStudent}
            variant="contained"
            disabled={dialogSaving}
          >
            {dialogSaving ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={Boolean(drawerStudentId)}
        onClose={() => setDrawerStudentId(null)}
        PaperProps={{ sx: { width: { xs: "100%", md: 520 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {drawerStudent ? formatStudentName(drawerStudent) : "Student"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admission: {drawerStudent?.admission_no || "-"} • ID:{" "}
                {drawerStudentId}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {drawerStudent ? (
                <Chip
                  label={(drawerStudent.status || "-").toUpperCase()}
                  color={statusChipColor(drawerStudent.status || "")}
                  size="small"
                />
              ) : null}
              <IconButton
                size="small"
                onClick={() => {
                  if (!drawerStudent) return;
                  openEditDialog(drawerStudent);
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Tabs
            value={drawerTab}
            onChange={(_e, v) => setDrawerTab(v)}
            sx={{ mt: 2 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Profile" />
            <Tab label="Attendance" />
            <Tab label="Fees" />
            <Tab label="Timetable" />
          </Tabs>
        </Box>
        <Divider />

        {drawerLoading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {drawerTab === 0 && (
              <Paper sx={{ p: 2, borderRadius: 3 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Name
                    </Typography>
                    <Typography fontWeight={700}>
                      {drawerStudent ? formatStudentName(drawerStudent) : "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Status
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {drawerStudent?.status || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography
                      fontWeight={700}
                      sx={{ textTransform: "capitalize" }}
                    >
                      {drawerStudent?.gender || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography fontWeight={700}>
                      {drawerStudent?.date_of_birth || "-"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => {
                          if (drawerStudent)
                            handleDownloadIdCard(drawerStudent);
                        }}
                      >
                        ID Card
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          if (drawerStudent)
                            handleDeactivateStudent(drawerStudent);
                        }}
                        disabled={
                          drawerStudent?.status?.toLowerCase() !== "active"
                        }
                      >
                        Deactivate
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {drawerTab === 1 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>
                    Attendance (Last 30 days)
                  </Typography>
                  {attendanceSummary ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {Object.entries(attendanceSummary)
                        .filter(([k]) => k !== "total")
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, v]) => (
                          <Chip
                            key={k}
                            label={`${k}: ${v}`}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                          />
                        ))}
                      <Chip
                        label={`Total: ${attendanceSummary.total ?? 0}`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      Attendance data is unavailable or you don’t have access.
                    </Typography>
                  )}
                </Paper>

                <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(attendanceRecords ?? [])
                        .slice(-20)
                        .reverse()
                        .map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.attendance_date}</TableCell>
                            <TableCell sx={{ textTransform: "capitalize" }}>
                              {r.status}
                            </TableCell>
                          </TableRow>
                        ))}
                      {!attendanceRecords || attendanceRecords.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            sx={{ py: 4, textAlign: "center" }}
                          >
                            <Typography color="text.secondary">
                              No attendance records found for this period.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {drawerTab === 2 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>
                    Fee Dues
                  </Typography>
                  {feeDues ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {feeDues.slice(0, 6).map((d) => (
                        <Box
                          key={d.id}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography
                              fontWeight={700}
                              sx={{ textTransform: "capitalize" }}
                            >
                              {d.status}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Due: {d.due_amount.toLocaleString()} • Paid:{" "}
                              {d.paid_amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${d.due_amount.toLocaleString()}`}
                            color={d.due_amount > 0 ? "warning" : "success"}
                            size="small"
                          />
                        </Box>
                      ))}
                      {feeDues.length === 0 ? (
                        <Typography color="text.secondary">
                          No dues found.
                        </Typography>
                      ) : null}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      Fee data is unavailable or you don’t have access.
                    </Typography>
                  )}
                </Paper>

                <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                  <Box sx={{ p: 2 }}>
                    <Typography fontWeight={800}>Recent Payments</Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(feePayments ?? []).slice(0, 10).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell>{p.amount.toLocaleString()}</TableCell>
                          <TableCell>{p.payment_method || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {!feePayments || feePayments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            sx={{ py: 4, textAlign: "center" }}
                          >
                            <Typography color="text.secondary">
                              No payments found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>
            )}

            {drawerTab === 3 && (
              <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
                <Box sx={{ p: 2 }}>
                  <Typography fontWeight={800}>Timetable</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shows schedule based on active enrollment.
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell>Room</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(timetable ?? []).slice(0, 30).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {dayLabels[t.day_of_week] ?? t.day_of_week}
                        </TableCell>
                        <TableCell>
                          {t.start_time} - {t.end_time}
                        </TableCell>
                        <TableCell>{t.room || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!timetable || timetable.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{ py: 4, textAlign: "center" }}
                        >
                          <Typography color="text.secondary">
                            No timetable found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
