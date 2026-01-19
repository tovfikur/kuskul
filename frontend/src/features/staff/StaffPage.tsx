import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  Tab,
  Tabs,
  TablePagination,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Add, Delete, Download, Search, UploadFile } from "@mui/icons-material";
import {
  createStaff,
  createStaffPerformance,
  createStaffQualification,
  deleteStaff,
  deleteStaffDocument,
  deleteStaffPerformance,
  deleteStaffQualification,
  downloadStaffQr,
  getStaff,
  getStaffAttendance,
  getStaffDocuments,
  getStaffPerformance,
  getStaffQualifications,
  staffCheckIn,
  staffCheckOut,
  updateStaff,
  uploadStaffDocument,
  type Staff,
  type StaffAttendanceRecord,
  type StaffDocument,
  type StaffPerformanceRecord,
  type StaffQualification,
} from "../../api/people";
import { showToast } from "../../app/toast";

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  const [selectedId, setSelectedId] = useState<string>("");
  const selected = useMemo(
    () => staff.find((s) => s.id === selectedId) || null,
    [selectedId, staff],
  );

  const [detailsTab, setDetailsTab] = useState(0);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [attendance, setAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [qualifications, setQualifications] = useState<StaffQualification[]>(
    [],
  );
  const [performance, setPerformance] = useState<StaffPerformanceRecord[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    employee_id: "",
    designation: "",
    department: "",
    email: "",
    phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    date_of_joining: "",
    status: "active",
  });

  const [qualForm, setQualForm] = useState({
    title: "",
    institution: "",
    issued_on: "",
    expires_on: "",
    credential_id: "",
  });

  const [perfForm, setPerfForm] = useState({
    period_start: "",
    period_end: "",
    rating: "",
    summary: "",
  });

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

  function nullIfBlank(v: string) {
    const t = v.trim();
    return t ? t : null;
  }

  const loadStaff = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const res = await getStaff(targetPage + 1, rowsPerPage);
        setStaff(res.items);
        setTotal(res.total ?? res.items.length);
        if (!selectedId && res.items.length > 0) {
          setSelectedId(res.items[0].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [rowsPerPage, selectedId],
  );

  useEffect(() => {
    loadStaff(page).catch((e) => console.error(e));
  }, [page, loadStaff]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (status && s.status !== status) return false;
      if (department && (s.department || "") !== department) return false;
      if (designation && (s.designation || "") !== designation) return false;
      if (!q) return true;
      const hay = [
        s.full_name,
        s.employee_id || "",
        s.email || "",
        s.phone || "",
        s.designation || "",
        s.department || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [staff, search, status, department, designation]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const s of staff) {
      if (s.department) set.add(s.department);
    }
    return Array.from(set).sort();
  }, [staff]);

  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    for (const s of staff) {
      if (s.designation) set.add(s.designation);
    }
    return Array.from(set).sort();
  }, [staff]);

  const loadDetails = async (staffId: string) => {
    setDetailsLoading(true);
    try {
      const [att, quals, perf, docs] = await Promise.all([
        getStaffAttendance(staffId).catch(() => [] as StaffAttendanceRecord[]),
        getStaffQualifications(staffId).catch(() => [] as StaffQualification[]),
        getStaffPerformance(staffId).catch(
          () => [] as StaffPerformanceRecord[],
        ),
        getStaffDocuments(staffId).catch(() => [] as StaffDocument[]),
      ]);
      setAttendance(att);
      setQualifications(quals);
      setPerformance(perf);
      setDocuments(docs);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    loadDetails(selectedId).catch((e) => console.error(e));
  }, [selectedId]);

  const openCreateDialog = () => {
    setForm({
      full_name: "",
      employee_id: "",
      designation: "",
      department: "",
      email: "",
      phone: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relation: "",
      date_of_joining: "",
      status: "active",
    });
    setOpenCreate(true);
  };

  const openEditDialog = () => {
    if (!selected) return;
    setForm({
      full_name: selected.full_name || "",
      employee_id: selected.employee_id || "",
      designation: selected.designation || "",
      department: selected.department || "",
      email: selected.email || "",
      phone: selected.phone || "",
      emergency_contact_name: selected.emergency_contact_name || "",
      emergency_contact_phone: selected.emergency_contact_phone || "",
      emergency_contact_relation: selected.emergency_contact_relation || "",
      date_of_joining: selected.date_of_joining || "",
      status: selected.status || "active",
    });
    setOpenEdit(true);
  };

  const submitCreate = async () => {
    const payload = {
      full_name: form.full_name,
      employee_id: nullIfBlank(form.employee_id),
      designation: nullIfBlank(form.designation),
      department: nullIfBlank(form.department),
      email: nullIfBlank(form.email),
      phone: nullIfBlank(form.phone),
      emergency_contact_name: nullIfBlank(form.emergency_contact_name),
      emergency_contact_phone: nullIfBlank(form.emergency_contact_phone),
      emergency_contact_relation: nullIfBlank(form.emergency_contact_relation),
      date_of_joining: form.date_of_joining ? form.date_of_joining : null,
      status: form.status,
    };
    const s = await createStaff(payload);
    setOpenCreate(false);
    await loadStaff(page);
    setSelectedId(s.id);
  };

  const submitEdit = async () => {
    if (!selected) return;
    const payload = {
      full_name: form.full_name,
      employee_id: nullIfBlank(form.employee_id),
      designation: nullIfBlank(form.designation),
      department: nullIfBlank(form.department),
      email: nullIfBlank(form.email),
      phone: nullIfBlank(form.phone),
      emergency_contact_name: nullIfBlank(form.emergency_contact_name),
      emergency_contact_phone: nullIfBlank(form.emergency_contact_phone),
      emergency_contact_relation: nullIfBlank(form.emergency_contact_relation),
      date_of_joining: form.date_of_joining ? form.date_of_joining : null,
      status: form.status,
    };
    await updateStaff(selected.id, payload);
    setOpenEdit(false);
    await loadStaff(page);
    await loadDetails(selected.id);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    await deleteStaff(selected.id);
    setOpenDelete(false);
    await loadStaff(page);
    setSelectedId("");
    setAttendance([]);
    setQualifications([]);
    setPerformance([]);
    setDocuments([]);
  };

  const handleDownloadQr = async () => {
    if (!selected) return;
    const blob = await downloadStaffQr(selected.id);
    downloadBlob(blob, `staff_qr_${selected.id}.svg`);
  };

  const handleCheckIn = async () => {
    if (!selected) return;
    await staffCheckIn({
      staff_id: selected.id,
      method: "qr",
      device_id: "web",
    });
    await loadDetails(selected.id);
  };

  const handleCheckOut = async () => {
    if (!selected) return;
    await staffCheckOut({
      staff_id: selected.id,
      method: "qr",
      device_id: "web",
    });
    await loadDetails(selected.id);
  };

  const addQualification = async () => {
    if (!selected) return;
    if (!qualForm.title.trim()) {
      showToast({
        severity: "error",
        message: "Qualification title is required",
      });
      return;
    }
    await createStaffQualification(selected.id, {
      title: qualForm.title,
      institution: nullIfBlank(qualForm.institution),
      issued_on: qualForm.issued_on || null,
      expires_on: qualForm.expires_on || null,
      credential_id: nullIfBlank(qualForm.credential_id),
    });
    setQualForm({
      title: "",
      institution: "",
      issued_on: "",
      expires_on: "",
      credential_id: "",
    });
    await loadDetails(selected.id);
  };

  const removeQualification = async (id: string) => {
    if (!selected) return;
    await deleteStaffQualification(selected.id, id);
    await loadDetails(selected.id);
  };

  const addPerformance = async () => {
    if (!selected) return;
    const rating = perfForm.rating.trim()
      ? Number(perfForm.rating.trim())
      : null;
    if (rating !== null && (Number.isNaN(rating) || rating < 1 || rating > 5)) {
      showToast({ severity: "error", message: "Rating must be 1 to 5" });
      return;
    }
    await createStaffPerformance(selected.id, {
      period_start: perfForm.period_start || null,
      period_end: perfForm.period_end || null,
      rating,
      summary: nullIfBlank(perfForm.summary),
    });
    setPerfForm({ period_start: "", period_end: "", rating: "", summary: "" });
    await loadDetails(selected.id);
  };

  const removePerformance = async (id: string) => {
    if (!selected) return;
    await deleteStaffPerformance(selected.id, id);
    await loadDetails(selected.id);
  };

  const onUploadDocument = async (file: File) => {
    if (!selected) return;
    await uploadStaffDocument(selected.id, file);
    await loadDetails(selected.id);
  };

  const removeDocument = async (id: string) => {
    if (!selected) return;
    await deleteStaffDocument(selected.id, id);
    await loadDetails(selected.id);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography variant="h4">Staff Management</Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
          >
            Add Staff
          </Button>
          <Button
            variant="outlined"
            onClick={openEditDialog}
            disabled={!selected}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setOpenDelete(true)}
            disabled={!selected}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5} lg={4}>
          <Card>
            <CardContent>
              <TextField
                fullWidth
                placeholder="Search staff"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
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
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={department}
                    label="Department"
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {uniqueDepartments.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Designation</InputLabel>
                  <Select
                    value={designation}
                    label="Designation"
                    onChange={(e) => setDesignation(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    {uniqueDesignations.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 2 }} />

              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Employee ID</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredStaff.map((row) => (
                        <TableRow
                          key={row.id}
                          hover
                          selected={row.id === selectedId}
                          sx={{ cursor: "pointer" }}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <TableCell>{row.full_name}</TableCell>
                          <TableCell>{row.employee_id || "-"}</TableCell>
                          <TableCell>{row.status}</TableCell>
                        </TableRow>
                      ))}
                      {filteredStaff.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3}>No staff found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[rowsPerPage]}
              />

              <Box sx={{ mt: 1, color: "text.secondary", fontSize: 12 }}>
                Showing {filteredStaff.length} of {staff.length} loaded (total:{" "}
                {total})
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7} lg={8}>
          <Card>
            <CardContent>
              {!selected ? (
                <Typography color="text.secondary">
                  Select a staff member to view details.
                </Typography>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{selected.full_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selected.designation || "-"} •{" "}
                        {selected.department || "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selected.email || "-"} • {selected.phone || "-"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={handleDownloadQr}
                      >
                        QR
                      </Button>
                      <Button size="small" onClick={handleCheckIn}>
                        Check-in
                      </Button>
                      <Button size="small" onClick={handleCheckOut}>
                        Check-out
                      </Button>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Tabs
                    value={detailsTab}
                    onChange={(_, v) => setDetailsTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    <Tab label="Profile" />
                    <Tab label="Attendance" />
                    <Tab label="Leave" />
                    <Tab label="Documents" />
                    <Tab label="Qualifications" />
                    <Tab label="Performance" />
                  </Tabs>

                  <Divider sx={{ my: 2 }} />

                  {detailsLoading ? <CircularProgress size={24} /> : null}

                  {detailsTab === 0 && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography fontWeight={700} sx={{ mb: 1 }}>
                          Personal
                        </Typography>
                        <List dense disablePadding>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Employee ID"
                              secondary={selected.employee_id || "-"}
                            />
                          </ListItem>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Status"
                              secondary={selected.status}
                            />
                          </ListItem>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Date of joining"
                              secondary={selected.date_of_joining || "-"}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography fontWeight={700} sx={{ mb: 1 }}>
                          Emergency Contact
                        </Typography>
                        <List dense disablePadding>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Name"
                              secondary={selected.emergency_contact_name || "-"}
                            />
                          </ListItem>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Phone"
                              secondary={
                                selected.emergency_contact_phone || "-"
                              }
                            />
                          </ListItem>
                          <ListItem disableGutters>
                            <ListItemText
                              primary="Relation"
                              secondary={
                                selected.emergency_contact_relation || "-"
                              }
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  )}

                  {detailsTab === 1 && (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Check-in</TableCell>
                            <TableCell>Check-out</TableCell>
                            <TableCell>Method</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {attendance.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.attendance_date}</TableCell>
                              <TableCell>{r.status}</TableCell>
                              <TableCell>{r.check_in_at || "-"}</TableCell>
                              <TableCell>{r.check_out_at || "-"}</TableCell>
                              <TableCell>{r.method || "-"}</TableCell>
                            </TableRow>
                          ))}
                          {attendance.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                No attendance records
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}

                  {detailsTab === 2 && (
                    <Typography color="text.secondary">
                      Leave UI uses the existing leave module. Filter by staff
                      is supported in the API.
                    </Typography>
                  )}

                  {detailsTab === 3 && (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          flexWrap: "wrap",
                          mb: 2,
                        }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadDocument(f).catch(console.error);
                            e.currentTarget.value = "";
                          }}
                        />
                        <Button
                          size="small"
                          startIcon={<UploadFile />}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload
                        </Button>
                      </Box>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Filename</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {documents.map((d) => (
                              <TableRow key={d.id}>
                                <TableCell>{d.filename}</TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      removeDocument(d.id).catch(console.error)
                                    }
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                            {documents.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={2}>
                                  No documents uploaded
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {detailsTab === 4 && (
                    <>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Title"
                            value={qualForm.title}
                            onChange={(e) =>
                              setQualForm({
                                ...qualForm,
                                title: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Institution"
                            value={qualForm.institution}
                            onChange={(e) =>
                              setQualForm({
                                ...qualForm,
                                institution: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Credential ID"
                            value={qualForm.credential_id}
                            onChange={(e) =>
                              setQualForm({
                                ...qualForm,
                                credential_id: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Issued On"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={qualForm.issued_on}
                            onChange={(e) =>
                              setQualForm({
                                ...qualForm,
                                issued_on: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Expires On"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={qualForm.expires_on}
                            onChange={(e) =>
                              setQualForm({
                                ...qualForm,
                                expires_on: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid
                          item
                          xs={12}
                          md={4}
                          sx={{ display: "flex", alignItems: "center" }}
                        >
                          <Button
                            variant="contained"
                            onClick={() =>
                              addQualification().catch(console.error)
                            }
                          >
                            Add
                          </Button>
                        </Grid>
                      </Grid>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Title</TableCell>
                              <TableCell>Institution</TableCell>
                              <TableCell>Issued</TableCell>
                              <TableCell>Expires</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {qualifications.map((q) => (
                              <TableRow key={q.id}>
                                <TableCell>{q.title}</TableCell>
                                <TableCell>{q.institution || "-"}</TableCell>
                                <TableCell>{q.issued_on || "-"}</TableCell>
                                <TableCell>{q.expires_on || "-"}</TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      removeQualification(q.id).catch(
                                        console.error,
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                            {qualifications.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  No qualifications
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {detailsTab === 5 && (
                    <>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Period Start"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={perfForm.period_start}
                            onChange={(e) =>
                              setPerfForm({
                                ...perfForm,
                                period_start: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Period End"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={perfForm.period_end}
                            onChange={(e) =>
                              setPerfForm({
                                ...perfForm,
                                period_end: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          <TextField
                            fullWidth
                            label="Rating (1-5)"
                            value={perfForm.rating}
                            onChange={(e) =>
                              setPerfForm({
                                ...perfForm,
                                rating: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Summary"
                            value={perfForm.summary}
                            onChange={(e) =>
                              setPerfForm({
                                ...perfForm,
                                summary: e.target.value,
                              })
                            }
                          />
                        </Grid>
                        <Grid
                          item
                          xs={12}
                          md={12}
                          sx={{ display: "flex", justifyContent: "flex-end" }}
                        >
                          <Button
                            variant="contained"
                            onClick={() =>
                              addPerformance().catch(console.error)
                            }
                          >
                            Add
                          </Button>
                        </Grid>
                      </Grid>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Period</TableCell>
                              <TableCell>Rating</TableCell>
                              <TableCell>Summary</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {performance.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell>
                                  {(r.period_start || "-") +
                                    " → " +
                                    (r.period_end || "-")}
                                </TableCell>
                                <TableCell>{r.rating ?? "-"}</TableCell>
                                <TableCell>{r.summary || "-"}</TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      removePerformance(r.id).catch(
                                        console.error,
                                      )
                                    }
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                            {performance.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={4}>
                                  No performance records
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add staff</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employee ID"
                value={form.employee_id}
                onChange={(e) =>
                  setForm({ ...form, employee_id: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Emergency name"
                value={form.emergency_contact_name}
                onChange={(e) =>
                  setForm({ ...form, emergency_contact_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Emergency phone"
                value={form.emergency_contact_phone}
                onChange={(e) =>
                  setForm({ ...form, emergency_contact_phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Relation"
                value={form.emergency_contact_relation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergency_contact_relation: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.date_of_joining}
                onChange={(e) =>
                  setForm({ ...form, date_of_joining: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            onClick={() => submitCreate().catch(console.error)}
            variant="contained"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit staff</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full name"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employee ID"
                value={form.employee_id}
                onChange={(e) =>
                  setForm({ ...form, employee_id: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Emergency name"
                value={form.emergency_contact_name}
                onChange={(e) =>
                  setForm({ ...form, emergency_contact_name: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Emergency phone"
                value={form.emergency_contact_phone}
                onChange={(e) =>
                  setForm({ ...form, emergency_contact_phone: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Relation"
                value={form.emergency_contact_relation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergency_contact_relation: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hire date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={form.date_of_joining}
                onChange={(e) =>
                  setForm({ ...form, date_of_joining: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                  <MenuItem value="suspended">suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button
            onClick={() => submitEdit().catch(console.error)}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete staff</DialogTitle>
        <DialogContent>
          <Typography>
            Delete {selected?.full_name || "this staff member"}? This does not
            delete uploaded documents in other modules.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => confirmDelete().catch(console.error)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
