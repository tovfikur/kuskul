import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Stack,
  CircularProgress
} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  Person,
  School,
  Info,
  HourglassEmpty
} from "@mui/icons-material";
import { 
  getStudents, 
  updateStudent, 
  getEnrollmentsByStudents,
  type Student,
  type Enrollment
} from "../../../api/people";
import { showToast } from "../../../app/toast";
import {
  getCurrentAcademicYear,
  getClasses,
  getSections,
  type SchoolClass,
  type Section,
  type AcademicYear
} from "../../../api/academic";
import AdmissionFormDialog from "./AdmissionFormDialog";

export default function AdmissionsTab() {
  // Data States
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  // Filter & Pagination States
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("pending");

  // Form & Dialog States
  const [admissionFormOpen, setAdmissionFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Student | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [viewTab, setViewTab] = useState(0);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadCurrentYear();
    loadClasses();
    loadAdmissions();
  }, []);

  async function loadCurrentYear() {
    try {
      const year = await getCurrentAcademicYear();
      setCurrentYear(year);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadClasses() {
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAdmissions() {
    setLoading(true);
    try {
      // Fetch a large batch to perform client-side filtering for Admission Status correctness
      // since backend support for admission_status filter is uncertain.
      const res = await getStudents({
        page: 1,
        limit: 1000, 
      });
      // Sort by admission number desc or roughly by creation info if possible. 
      // Assuming API returns somewhat ordered list or we sort client side.
      // We'll trust API order for now.
      setAllStudents(res.items);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to load admissions" });
    } finally {
      setLoading(false);
    }
  }

  // Client-side Filtering
  const filteredAdmissions = useMemo(() => {
    return allStudents.filter((student) => {
      if (!statusFilter) return true;
      return student.admission_status?.toLowerCase() === statusFilter.toLowerCase();
    });
  }, [allStudents, statusFilter]);

  // Client-side Pagination
  const paginatedAdmissions = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredAdmissions.slice(start, end);
  }, [filteredAdmissions, page, rowsPerPage]);

  const stats = useMemo(() => {
    return {
      pending: allStudents.filter(
        (a) => a.admission_status?.toLowerCase() === "pending",
      ).length,
      approved: allStudents.filter(
        (a) => a.admission_status?.toLowerCase() === "approved",
      ).length,
      rejected: allStudents.filter(
        (a) => a.admission_status?.toLowerCase() === "rejected",
      ).length,
    };
  }, [allStudents]);

  async function loadAdmissionDetails(studentId: string) {
    setLoadingDetails(true);
    try {
      const enrollments = await getEnrollmentsByStudents([studentId]);
      if (enrollments.length > 0) {
        const output = enrollments.find(e => e.academic_year_id === currentYear?.id) || enrollments[0];
        setSelectedEnrollment(output);
      } else {
        setSelectedEnrollment(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    if (selectedAdmission && viewDialogOpen) {
      loadAdmissionDetails(selectedAdmission.id);
    }
  }, [selectedAdmission, viewDialogOpen]);

  async function handleApprove(student: Student) {
    try {
      await updateStudent(student.id, {
        admission_status: "approved",
        status: "active",
      });
      showToast({
        severity: "success",
        message: "Admission approved successfully",
      });
      loadAdmissions();
      setViewDialogOpen(false);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to approve admission" });
    }
  }

  async function handleReject(student: Student) {
    try {
      await updateStudent(student.id, {
        admission_status: "rejected",
        status: "inactive",
      });
      showToast({
        severity: "success",
        message: "Admission rejected",
      });
      loadAdmissions();
      setViewDialogOpen(false);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to reject admission" });
    }
  }

  async function handleWaitlist(student: Student) {
    try {
      await updateStudent(student.id, {
        admission_status: "waitlisted",
        status: "inactive",
      });
      showToast({
        severity: "info",
        message: "Admission waitlisted",
      });
      loadAdmissions();
      setViewDialogOpen(false);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to waitlist admission" });
    }
  }

  function getStatusColor(status?: string) {
    switch (status?.toLowerCase()) {
      case "approved": return "success";
      case "pending": return "warning";
      case "rejected": return "error";
      case "waitlisted": return "info";
      default: return "default";
    }
  }

  const getClassName = (classId?: string) => {
    if (!classId) return "N/A";
    return classes.find(c => c.id === classId)?.name || "Unknown Class";
  };

  return (
    <Box>
      {/* Header with Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            elevation={0}
            sx={{ 
              width: '100%',
              borderRadius: 3, 
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                Total Applications
              </Typography>
              <Typography variant="h3" fontWeight={700} sx={{ color: 'primary.main' }}>
                {allStudents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            elevation={0}
            sx={{ 
              width: '100%',
              borderRadius: 3, 
              border: '1px solid',
              borderColor: 'warning.light',
              bgcolor: 'warning.lighter',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography color="warning.dark" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                Pending Review
              </Typography>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            elevation={0}
            sx={{ 
              width: '100%',
              borderRadius: 3, 
              border: '1px solid',
              borderColor: 'success.light',
              bgcolor: 'success.lighter',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography color="success.dark" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                Approved
              </Typography>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card 
            elevation={0}
            sx={{ 
              width: '100%',
              borderRadius: 3, 
              border: '1px solid',
              borderColor: 'error.light',
              bgcolor: 'error.lighter',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography color="error.dark" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem', fontWeight: 500 }}>
                Rejected
              </Typography>
              <Typography variant="h3" fontWeight={700} color="error.main">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 240 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              label="Status Filter"
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0); // Reset to first page on filter change
              }}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="waitlisted">Waitlisted</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            startIcon={<Refresh />}
            onClick={loadAdmissions}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAdmissionFormOpen(true)}
          >
            New Admission
          </Button>
        </Box>
      </Paper>

      {/* Admissions Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Admission No</TableCell>
                <TableCell>Student Name</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Admission Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">Loading...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedAdmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      No admissions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAdmissions.map((admission) => (
                  <TableRow key={admission.id} hover>
                    <TableCell>{admission.admission_no || "N/A"}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {admission.first_name}{" "}
                          {admission.last_name || ""}
                        </Typography>
                        {admission.email && (
                          <Typography variant="caption" color="text.secondary">
                            {admission.email}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {admission.gender || "N/A"}
                    </TableCell>
                    <TableCell>
                      {admission.date_of_birth || "N/A"}
                    </TableCell>
                    <TableCell>
                      {admission.admission_date || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          admission.admission_status?.toUpperCase() || "PENDING"
                        }
                        color={getStatusColor(admission.admission_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedAdmission(admission);
                            setViewDialogOpen(true);
                            setViewTab(0);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {admission.admission_status?.toLowerCase() ===
                        "pending" && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(admission)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(admission)}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Waitlist">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleWaitlist(admission)}
                            >
                              <HourglassEmpty fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredAdmissions.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>

      {/* Comprehensive View Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: "90vh",
          },
        }}
      >
        {selectedAdmission && (
          <>
            <DialogTitle sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar 
                    src={selectedAdmission.photo_url || undefined}
                    sx={{ width: 64, height: 64, bgcolor: "primary.main" }}
                  >
                    {selectedAdmission.first_name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedAdmission.first_name} {selectedAdmission.last_name}
                    </Typography>
                    <Chip 
                      label={selectedAdmission.admission_status?.toUpperCase() || "PENDING"} 
                      color={getStatusColor(selectedAdmission.admission_status)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Stack>
                <IconButton onClick={() => setViewDialogOpen(false)}>
                  <Cancel />
                </IconButton>
              </Box>
              <Tabs 
                value={viewTab} 
                onChange={(_, v) => setViewTab(v)}
                sx={{ px: 3, borderBottom: 1, borderColor: "divider" }}
              >
                <Tab label="Personal Info" icon={<Person />} iconPosition="start" />
                <Tab label="Academic Info" icon={<School />} iconPosition="start" />
                <Tab label="Application Info" icon={<Info />} iconPosition="start" />
              </Tabs>
            </DialogTitle>
            
            <DialogContent sx={{ p: 4 }}>
              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {viewTab === 0 && (
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Full Name" value={`${selectedAdmission.first_name} ${selectedAdmission.last_name || ""}`} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Gender" value={selectedAdmission.gender || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Date of Birth" value={selectedAdmission.date_of_birth || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Nationality" value={selectedAdmission.nationality || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Religion" value={selectedAdmission.religion || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Blood Group" value={selectedAdmission.blood_group || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 1 }}>Contact</Divider>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Email" value={selectedAdmission.email || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Phone" value={selectedAdmission.phone || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Present Address" value={selectedAdmission.present_address || "N/A"} fullWidth multiline rows={2} InputProps={{ readOnly: true }} />
                      </Grid>
                    </Grid>
                  )}

                  {viewTab === 1 && (
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>Enrollment Details</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Class" value={getClassName(selectedEnrollment?.class_id)} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Section" value={selectedEnrollment?.section_id || "Pending Assignment"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Roll Number" value={selectedEnrollment?.roll_number || "Pending"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      
                      <Grid size={{ xs: 12 }}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" color="primary" gutterBottom>Previous History</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Previous School" value={selectedAdmission.previous_school_name || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Transfer Certificate" value={selectedAdmission.transfer_certificate_no || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                    </Grid>
                  )}

                  {viewTab === 2 && (
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Admission Number" value={selectedAdmission.admission_no || "Auto-Generated"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Admission Date" value={selectedAdmission.admission_date || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Current Status" value={selectedAdmission.status?.toUpperCase() || "N/A"} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Emergency Contact" value={`${selectedAdmission.emergency_contact_name || ""} (${selectedAdmission.emergency_contact_phone || ""})`} fullWidth InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Remarks" value={selectedAdmission.remarks || "No remarks"} fullWidth multiline rows={3} InputProps={{ readOnly: true }} />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setViewDialogOpen(false)} variant="outlined">Close</Button>
              {selectedAdmission.admission_status === "pending" && (
                <>
                  <Button variant="contained" color="error" onClick={() => handleReject(selectedAdmission)}>Reject</Button>
                  <Button variant="contained" color="info" onClick={() => handleWaitlist(selectedAdmission)}>Waitlist</Button>
                  <Button variant="contained" color="success" onClick={() => handleApprove(selectedAdmission)}>Approve Admission</Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <AdmissionFormDialog
        open={admissionFormOpen}
        onClose={() => setAdmissionFormOpen(false)}
        onSuccess={loadAdmissions}
      />
    </Box>
  );
}
