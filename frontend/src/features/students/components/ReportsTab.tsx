import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Stack,
  Divider,
  LinearProgress,
} from "@mui/material";
import {
  Download,
  PictureAsPdf,
  TableChart,
  Assessment,
  TrendingUp,
} from "@mui/icons-material";
import { getStudents, type Student } from "../../../api/people";
import {
  getClasses,
  getSections,
  getCurrentAcademicYear,
  type SchoolClass,
  type Section,
  type AcademicYear,
} from "../../../api/academic";
import { showToast } from "../../../app/toast";

export default function ReportsTab() {
  const [activeReportTab, setActiveReportTab] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [selectedGender, setSelectedGender] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadSections();
    } else {
      setSections([]);
      setSelectedSection("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  async function loadInitialData() {
    try {
      const [classesData, yearData] = await Promise.all([
        getClasses(),
        getCurrentAcademicYear(),
      ]);
      setClasses(classesData.filter((c) => c.is_active));
      setCurrentYear(yearData);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSections() {
    if (!selectedClass) return;
    try {
      const sectionsData = await getSections(selectedClass);
      setSections(sectionsData.filter((s) => s.is_active));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadStudentData() {
    setLoading(true);
    try {
      const res = await getStudents({
        class_id: selectedClass || undefined,
        section_id: selectedSection || undefined,
        status: selectedStatus || undefined,
        gender: selectedGender || undefined,
        limit: 1000,
      });
      setStudents(res.items);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to load student data" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection, selectedStatus, selectedGender]);

  const stats = {
    total: students.length,
    male: students.filter((s) => s.gender?.toLowerCase() === "male").length,
    female: students.filter((s) => s.gender?.toLowerCase() === "female").length,
    active: students.filter((s) => s.status?.toLowerCase() === "active").length,
    inactive: students.filter((s) => s.status?.toLowerCase() === "inactive").length,
  };

  const genderDistribution = [
    { label: "Male", value: stats.male, color: "info.main" },
    { label: "Female", value: stats.female, color: "secondary.main" },
    { label: "Other", value: stats.total - stats.male - stats.female, color: "grey.500" },
  ];

  const statusDistribution = [
    { label: "Active", value: stats.active, color: "success.main" },
    { label: "Inactive", value: stats.inactive, color: "error.main" },
  ];

  function exportToCSV() {
    if (students.length === 0) {
      showToast({ severity: "warning", message: "No data to export" });
      return;
    }

    const headers = [
      "Admission No",
      "First Name",
      "Last Name",
      "Gender",
      "Date of Birth",
      "Status",
      "Email",
      "Phone",
    ];

    const rows = students.map((s) => [
      s.admission_no || "",
      s.first_name,
      s.last_name || "",
      s.gender || "",
      s.date_of_birth || "",
      s.status,
      s.email || "",
      s.phone || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `student_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({ severity: "success", message: "Report exported successfully" });
  }

  return (
    <Box>
      {/* Header - Golden Ratio Spacing */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Assessment sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h4" fontWeight={700}>
            Student Reports & Analytics
          </Typography>
        </Stack>
        <Typography color="text.secondary" variant="body1">
          Generate comprehensive reports and analyze student data
        </Typography>
      </Box>

      {/* Report Type Tabs - Golden Ratio Design */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 4, 
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tabs
          value={activeReportTab}
          onChange={(_, v) => setActiveReportTab(v)}
          sx={{ 
            borderBottom: "1px solid",
            borderColor: "divider",
            px: 2,
          }}
        >
          <Tab 
            label="Overview Statistics" 
            icon={<TrendingUp />} 
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.95rem" }}
          />
          <Tab 
            label="Student List" 
            icon={<TableChart />} 
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.95rem" }}
          />
          <Tab 
            label="Distribution Analysis" 
            icon={<Assessment />} 
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.95rem" }}
          />
        </Tabs>
      </Paper>

      {/* Filters - Golden Ratio Spacing */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
          Filter Criteria
        </Typography>
        <Grid container spacing={3}>
          <Grid container item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Class</InputLabel>
              <Select
                value={selectedClass}
                label="Class"
                onChange={(e) => setSelectedClass(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Classes</MenuItem>
                {classes.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid container item xs={12} sm={6} md={3}>
            <FormControl fullWidth disabled={!selectedClass}>
              <InputLabel>Section</InputLabel>
              <Select
                value={selectedSection}
                label="Section"
                onChange={(e) => setSelectedSection(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sections.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid container item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={selectedStatus}
                label="Status"
                onChange={(e) => setSelectedStatus(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="alumni">Alumni</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid container item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                value={selectedGender}
                label="Gender"
                onChange={(e) => setSelectedGender(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={exportToCSV}
            disabled={loading || students.length === 0}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdf />}
            disabled
            sx={{ borderRadius: 2, px: 3 }}
          >
            Export PDF (Coming Soon)
          </Button>
        </Stack>
      </Paper>

      {/* Report Content */}
      {activeReportTab === 0 && (
        <Box>
          {/* Stats Cards - Golden Ratio Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid container item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Total Students
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary">
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid container item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "success.light",
                  bgcolor: "success.lighter",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(76,175,80,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography color="success.dark" variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Active Students
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="success.main">
                    {stats.active}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid container item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "info.light",
                  bgcolor: "info.lighter",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(33,150,243,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography color="info.dark" variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Male Students
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="info.main">
                    {stats.male}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid container item xs={12} sm={6} md={3}>
              <Card
                elevation={0}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "secondary.light",
                  bgcolor: "secondary.lighter",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(156,39,176,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography color="secondary.dark" variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Female Students
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="secondary.main">
                    {stats.female}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Distribution Charts */}
          <Grid container spacing={3}>
            <Grid container item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  width: "100%",
                  p: 4, 
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Gender Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Breakdown by gender category
                </Typography>
                {genderDistribution.map((item) => (
                  <Box key={item.label} sx={{ mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color={item.color}>
                        {item.value} ({stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={stats.total > 0 ? (item.value / stats.total) * 100 : 0}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "grey.200",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          backgroundColor: item.color,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>

            <Grid container item xs={12} md={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  width: "100%",
                  p: 4, 
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Status Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Active vs inactive students
                </Typography>
                {statusDistribution.map((item) => (
                  <Box key={item.label} sx={{ mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color={item.color}>
                        {item.value} ({stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0}%)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={stats.total > 0 ? (item.value / stats.total) * 100 : 0}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "grey.200",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          backgroundColor: item.color,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeReportTab === 1 && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Admission No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date of Birth</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Loading...</Typography>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No data found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id} hover>
                      <TableCell>{student.admission_no || "N/A"}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {student.first_name} {student.last_name || ""}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.gender || "N/A"}</TableCell>
                      <TableCell>{student.date_of_birth || "N/A"}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={
                            student.status?.toLowerCase() === "active"
                              ? "success.main"
                              : "error.main"
                          }
                          fontWeight={600}
                        >
                          {student.status?.toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {student.email || student.phone || "N/A"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {activeReportTab === 2 && (
        <Box>
          <Grid container spacing={3}>
            <Grid container item xs={12}>
              <Paper 
                elevation={0}
                sx={{ 
                  width: "100%",
                  p: 4, 
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Detailed Gender Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Comprehensive breakdown of student demographics
                </Typography>
                <Grid container spacing={3}>
                  {genderDistribution.map((item) => (
                    <Grid container item xs={12} sm={4} key={item.label}>
                      <Card
                        elevation={0}
                        sx={{
                          width: "100%",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <CardContent sx={{ p: 3, textAlign: "center" }}>
                          <Typography color="text.secondary" gutterBottom variant="body2" fontWeight={500}>
                            {item.label}
                          </Typography>
                          <Typography variant="h2" fontWeight={700} color={item.color} sx={{ my: 2 }}>
                            {item.value}
                          </Typography>
                          <Typography variant="body1" color="text.secondary" fontWeight={600}>
                            {stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : 0}% of total
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Total students analyzed: <strong>{stats.total}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Report generated: <strong>{new Date().toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
