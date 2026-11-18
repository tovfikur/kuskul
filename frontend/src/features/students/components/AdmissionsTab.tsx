import { useState, useEffect, useMemo, useCallback } from "react";
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
	  Link,
	  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Avatar,
  Divider,
	  Stack,
	  CircularProgress,
	  Alert
	} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
	  Visibility,
	  Refresh,
	  Person,
	  School,
	  HourglassEmpty,
	  People,
	  PhotoCamera,
	  Description,
	  Home,
	  ContactPhone,
	  QrCode2
	} from "@mui/icons-material";
	import { 
	  getStudents, 
	  updateStudent, 
	  updateEnrollment,
	  getNextEnrollmentRollNumber,
	  getEnrollmentsByStudents,
	  getStudentGuardians,
	  getStudentDocuments,
	  type Student,
	  type Enrollment,
	  type GuardianWithRelation,
	  type StudentDocument
		} from "../../../api/people";
		import { downloadDocument } from "../../../api/documents";
import { showToast } from "../../../app/toast";
import {
	  getCurrentAcademicYear,
	  getClasses,
	  getSections,
	  type SchoolClass,
	  type AcademicYear,
	  type Section
	} from "../../../api/academic";
import AdmissionFormDialog from "./AdmissionFormDialog";
import AdmissionShareDialog from "./AdmissionShareDialog";

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
	  const [selectedAdmission, setSelectedAdmission] = useState<Student | null>(null);
	  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
	  const [selectedGuardians, setSelectedGuardians] = useState<GuardianWithRelation[]>([]);
	  const [selectedDocuments, setSelectedDocuments] = useState<StudentDocument[]>([]);
	  const [selectedSections, setSelectedSections] = useState<Section[]>([]);
	  const [viewTab, setViewTab] = useState(0);
		  const [loadingDetails, setLoadingDetails] = useState(false);

		  function getFileNameFromUrl(url?: string | null) {
		    if (!url) return "";
		    return url.split("/").filter(Boolean).pop() || url;
		  }

		  function openFileUrl(url?: string | null) {
		    if (!url) return;
		    const opened = window.open(url, "_blank", "noopener,noreferrer");
		    if (!opened) {
		      showToast({ severity: "error", message: "Please allow popups to view this file" });
		    }
		  }

		  async function openDocument(document?: StudentDocument) {
		    if (!document) return;
		    try {
		      const blob = await downloadDocument(document.id);
		      const url = window.URL.createObjectURL(blob);
		      const opened = window.open(url, "_blank", "noopener,noreferrer");
		      if (!opened) {
		        showToast({ severity: "error", message: "Please allow popups to view this file" });
		        window.URL.revokeObjectURL(url);
		        return;
		      }
		      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
		    } catch (err) {
		      console.error(err);
		      showToast({ severity: "error", message: "Failed to open file" });
		    }
		  }

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

	  const loadAdmissionDetails = useCallback(async (studentId: string) => {
	    setLoadingDetails(true);
	    try {
	      const [enrollments, guardians, documents] = await Promise.all([
	        getEnrollmentsByStudents([studentId]),
	        getStudentGuardians(studentId).catch(() => []),
	        getStudentDocuments(studentId).catch(() => []),
	      ]);
	      if (enrollments.length > 0) {
	        const output = enrollments.find(e => e.academic_year_id === currentYear?.id) || enrollments[0];
	        setSelectedEnrollment(output);
	        const sections = await getSections(output.class_id).catch(() => []);
	        setSelectedSections(sections);
	      } else {
	        setSelectedEnrollment(null);
	        setSelectedSections([]);
	      }
	      setSelectedGuardians(guardians);
	      setSelectedDocuments(documents);
	    } catch (err) {
	      console.error(err);
	      setSelectedEnrollment(null);
	      setSelectedGuardians([]);
	      setSelectedDocuments([]);
	      setSelectedSections([]);
	    } finally {
	      setLoadingDetails(false);
	    }
	  }, [currentYear?.id]);

  useEffect(() => {
    if (selectedAdmission && viewDialogOpen) {
      loadAdmissionDetails(selectedAdmission.id);
    }
  }, [selectedAdmission, viewDialogOpen, loadAdmissionDetails]);

  async function handleApprove(student: Student) {
    try {
      if (!selectedEnrollment) {
        showToast({
          severity: "error",
          message: "Enrollment details are required to approve admission",
        });
        return;
      }

      if (!selectedEnrollment.section_id) {
        showToast({
          severity: "error",
          message: "Class and section are required to generate student roll number",
        });
        return;
      }

      const studentRollNumber = await getNextEnrollmentRollNumber({
        academic_year_id: selectedEnrollment.academic_year_id,
        class_id: selectedEnrollment.class_id,
        section_id: selectedEnrollment.section_id,
        roll_type: "student",
      });

      await updateEnrollment(selectedEnrollment.id, {
        roll_number: studentRollNumber,
      });

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

	  function canApproveOrReject(status?: string) {
	    return ["pending", "waitlisted"].includes(status?.toLowerCase() ?? "");
	  }

	  function canWaitlist(status?: string) {
	    return status?.toLowerCase() === "pending";
	  }

	  const getClassName = (classId?: string) => {
	    if (!classId) return "N/A";
	    return classes.find(c => c.id === classId)?.name || "Unknown Class";
	  };

	  const getSectionName = (sectionId?: string | null) => {
	    if (!sectionId) return "N/A";
	    return selectedSections.find((s) => s.id === sectionId)?.name || "Unknown Section";
	  };

	  const getGuardianByRelation = (relation: "father" | "mother") =>
	    selectedGuardians.find((g) => g.relation?.toLowerCase() === relation);

	  const getDocumentByType = (
	    type: "transfer_certificate" | "birth_certificate",
	  ) =>
	    selectedDocuments.find((doc) => doc.entity_type === `student:${type}`);

	  const display = (value?: string | number | null) => {
	    if (value === null || value === undefined || value === "") return "N/A";
	    return String(value);
	  };

	  const readOnlyInputProps = { readOnly: true };

	  const fatherGuardian = getGuardianByRelation("father");
	  const motherGuardian = getGuardianByRelation("mother");
	  const transferCertificateDoc = getDocumentByType("transfer_certificate");
	  const birthCertificateDoc = getDocumentByType("birth_certificate");

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
            variant="outlined"
            startIcon={<QrCode2 />}
            onClick={() => setShareDialogOpen(true)}
          >
            Share Admission Form
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
            display: "flex",
            maxHeight: "90vh",
            overflow: "hidden",
          },
        }}
      >
        {selectedAdmission && (
          <>
            <DialogTitle sx={{ p: 0, flexShrink: 0 }}>
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
	                <Tab label="Student Details" icon={<Person />} iconPosition="start" />
	                <Tab label="Academic Info" icon={<School />} iconPosition="start" />
	                <Tab label="Parent / Guardian" icon={<People />} iconPosition="start" />
              </Tabs>
            </DialogTitle>
            
            <DialogContent
              dividers
              sx={{
                p: 4,
                pt: 4.5,
                flex: "1 1 auto",
                overflowY: "auto",
              }}
            >
              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
	                  {viewTab === 0 && (
	                    <Grid container spacing={4}>
	                      <Grid size={{ xs: 12, md: 4 }}>
	                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
	                          <Paper
	                            elevation={0}
	                            sx={{
	                              p: 3,
	                              width: "100%",
	                              borderRadius: 3,
	                              border: "1px solid",
	                              borderColor: "divider",
	                              textAlign: "center",
	                              mb: 3,
	                            }}
	                          >
	                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
	                              Student Photo
	                            </Typography>
	                            <Avatar
	                              src={selectedAdmission.photo_url || undefined}
	                              sx={{
	                                width: 160,
	                                height: 160,
	                                mx: "auto",
	                                mb: 2,
	                                border: "4px solid",
	                                borderColor: "primary.light",
	                              }}
	                            >
	                              <PhotoCamera sx={{ fontSize: 48 }} />
	                            </Avatar>
		                            {selectedAdmission.photo_url ? (
		                              <Link
		                                component="button"
		                                type="button"
		                                variant="caption"
		                                underline="hover"
		                                onClick={() => openFileUrl(selectedAdmission.photo_url)}
		                              >
		                                {/* {getFileNameFromUrl(selectedAdmission.photo_url)} */}
		                              </Link>
		                            ) : (
		                              <Typography variant="caption" color="text.secondary" display="block">
		                                No photo uploaded
		                              </Typography>
		                            )}
	                          </Paper>

	                          <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
	                            Admission No: <strong>{selectedAdmission.admission_no || "Auto-Generated"}</strong>
	                          </Alert>
	                        </Box>
	                      </Grid>

	                      <Grid size={{ xs: 12, md: 8 }}>
	                        <Grid container spacing={3}>
	                          <Grid size={{ xs: 12 }}>
	                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
	                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} />
	                              <Typography variant="h6" fontWeight={700}>
	                                Personal Information
	                              </Typography>
	                            </Stack>
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="First Name" value={display(selectedAdmission.first_name)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Last Name" value={display(selectedAdmission.last_name)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Gender" value={display(selectedAdmission.gender)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Date of Birth" value={display(selectedAdmission.date_of_birth)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Nationality" value={display(selectedAdmission.nationality)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Blood Group" value={display(selectedAdmission.blood_group)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12 }}>
	                            <Divider sx={{ my: 1 }} />
	                          </Grid>
	                          <Grid size={{ xs: 12 }}>
	                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
	                              <Home color="action" />
	                              <Typography variant="h6" fontWeight={700}>
	                                Address Details
	                              </Typography>
	                            </Stack>
	                          </Grid>
	                          <Grid size={{ xs: 12 }}>
	                            <TextField label="Present Address" value={display(selectedAdmission.present_address)} fullWidth multiline rows={2} InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="City" value={display(selectedAdmission.city)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Postal Code" value={display(selectedAdmission.postal_code)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12 }}>
	                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, mt: 1 }}>
	                              <ContactPhone color="action" />
	                              <Typography variant="h6" fontWeight={700}>
	                                Emergency Contact
	                              </Typography>
	                            </Stack>
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Contact Name" value={display(selectedAdmission.emergency_contact_name)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                          <Grid size={{ xs: 12, sm: 6 }}>
	                            <TextField label="Phone Number" value={display(selectedAdmission.emergency_contact_phone)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                          </Grid>
	                        </Grid>
	                      </Grid>
	                    </Grid>
	                  )}

	                  {viewTab === 1 && (
	                    <Grid container spacing={4}>
	                      <Grid size={{ xs: 12 }}>
	                        <Alert severity="info" icon={<School />} sx={{ borderRadius: 2, py: 1 }}>
	                          Enrolling for Academic Year: <strong>{currentYear?.name || "Current Year"}</strong>
	                        </Alert>
	                      </Grid>
	                      <Grid size={{ xs: 12 }}>
	                        <Typography variant="h6" fontWeight={700} gutterBottom>
	                          Enrollment Details
	                        </Typography>
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 4 }}>
	                        <TextField label="Class" value={getClassName(selectedEnrollment?.class_id)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 4 }}>
	                        <TextField label="Section" value={getSectionName(selectedEnrollment?.section_id)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 4 }}>
	                        <TextField label="Admission Roll Number" value={display(selectedEnrollment?.roll_number) === "N/A" ? "Pending" : display(selectedEnrollment?.roll_number)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 6 }}>
	                        <TextField label="Admission Date" value={display(selectedAdmission.admission_date)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 6 }}>
	                        <TextField label="Admission Number" value={selectedAdmission.admission_no || "Auto-Generated"} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 6 }}>
	                        <TextField label="Medium" value={display(selectedAdmission.medium)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, sm: 6 }}>
	                        <TextField label="Shift" value={display(selectedAdmission.shift)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12 }}>
	                        <Divider sx={{ my: 2 }} />
	                        <Typography variant="h6" fontWeight={700} gutterBottom>
	                          Extra Information
	                        </Typography>
	                      </Grid>
	                      <Grid size={{ xs: 12 }}>
	                        <TextField label="Previous School Name" value={display(selectedAdmission.previous_school_name)} fullWidth InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                      </Grid>
	                      <Grid size={{ xs: 12, md: 6 }}>
	                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center", bgcolor: "grey.50" }}>
	                          <Description color="action" />
	                          <Typography variant="subtitle2" fontWeight={700}>
	                            Transfer Certificate
	                          </Typography>
		                          {transferCertificateDoc ? (
		                            <Link
		                              component="button"
		                              type="button"
		                              variant="body2"
		                              underline="hover"
		                              fontWeight={500}
		                              onClick={() => openDocument(transferCertificateDoc)}
		                            >
		                              {transferCertificateDoc.filename}
		                            </Link>
		                          ) : (
		                            <Typography variant="body2" color="text.secondary">
		                              {selectedAdmission.transfer_certificate_no || "No file uploaded"}
		                            </Typography>
		                          )}
	                        </Paper>
	                      </Grid>
	                      <Grid size={{ xs: 12, md: 6 }}>
	                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center", bgcolor: "grey.50" }}>
	                          <Description color="action" />
	                          <Typography variant="subtitle2" fontWeight={700}>
	                            Birth Certificate
	                          </Typography>
		                          {birthCertificateDoc ? (
		                            <Link
		                              component="button"
		                              type="button"
		                              variant="body2"
		                              underline="hover"
		                              fontWeight={500}
		                              onClick={() => openDocument(birthCertificateDoc)}
		                            >
		                              {birthCertificateDoc.filename}
		                            </Link>
		                          ) : (
		                            <Typography variant="body2" color="text.secondary">
		                              {selectedAdmission.birth_certificate_no || "No file uploaded"}
		                            </Typography>
		                          )}
	                        </Paper>
	                      </Grid>
	                    </Grid>
	                  )}

	                  {viewTab === 2 && (
	                    <Grid container spacing={4}>
	                      <Grid size={{ xs: 12, md: 6 }}>
	                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
	                          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
	                            <Avatar src={fatherGuardian?.photo_url || undefined} sx={{ bgcolor: "info.main" }}>F</Avatar>
	                            <Typography variant="h6" fontWeight={700}>Father's Info</Typography>
	                          </Stack>
	                          <Grid container spacing={2}>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Full Name" value={display(fatherGuardian?.full_name)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Phone Number" value={display(fatherGuardian?.phone)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Email" value={display(fatherGuardian?.email)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Occupation" value={display(fatherGuardian?.occupation)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="NID Number" value={display(fatherGuardian?.id_number)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
		                                {fatherGuardian?.photo_url ? (
		                                  <Link
		                                    component="button"
		                                    type="button"
		                                    variant="body2"
		                                    underline="hover"
		                                    onClick={() => openFileUrl(fatherGuardian.photo_url)}
		                                  >
		                                    {getFileNameFromUrl(fatherGuardian.photo_url)}
		                                  </Link>
		                                ) : (
		                                  <Typography variant="body2" color="text.secondary">
		                                    No photo uploaded
		                                  </Typography>
		                                )}
	                              </Paper>
	                            </Grid>
	                          </Grid>
	                        </Paper>
	                      </Grid>

	                      <Grid size={{ xs: 12, md: 6 }}>
	                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
	                          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
	                            <Avatar src={motherGuardian?.photo_url || undefined} sx={{ bgcolor: "secondary.main" }}>M</Avatar>
	                            <Typography variant="h6" fontWeight={700}>Mother's Info</Typography>
	                          </Stack>
	                          <Grid container spacing={2}>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Full Name" value={display(motherGuardian?.full_name)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Phone Number" value={display(motherGuardian?.phone)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Email" value={display(motherGuardian?.email)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="Occupation" value={display(motherGuardian?.occupation)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <TextField label="NID Number" value={display(motherGuardian?.id_number)} fullWidth size="small" InputProps={readOnlyInputProps} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
	                            </Grid>
	                            <Grid size={{ xs: 12 }}>
	                              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
		                                {motherGuardian?.photo_url ? (
		                                  <Link
		                                    component="button"
		                                    type="button"
		                                    variant="body2"
		                                    underline="hover"
		                                    onClick={() => openFileUrl(motherGuardian.photo_url)}
		                                  >
		                                    {getFileNameFromUrl(motherGuardian.photo_url)}
		                                  </Link>
		                                ) : (
		                                  <Typography variant="body2" color="text.secondary">
		                                    No photo uploaded
		                                  </Typography>
		                                )}
	                              </Paper>
	                            </Grid>
	                          </Grid>
	                        </Paper>
	                      </Grid>
	                    </Grid>
	                  )}
                </Box>
              )}
            </DialogContent>
	            <DialogActions sx={{ p: 3, flexShrink: 0 }}>
	              <Button onClick={() => setViewDialogOpen(false)} variant="outlined">Close</Button>
	              {canApproveOrReject(selectedAdmission.admission_status) && (
	                <>
	                  {canWaitlist(selectedAdmission.admission_status) && (
	                    <Button variant="contained" color="info" onClick={() => handleWaitlist(selectedAdmission)}>Waitlist</Button>
	                  )}
	                  <Button variant="contained" color="success" onClick={() => handleApprove(selectedAdmission)}>Approve Admission</Button>
	                  <Button variant="contained" color="error" onClick={() => handleReject(selectedAdmission)}>Reject</Button>
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
      <AdmissionShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
      />
    </Box>
  );
}
