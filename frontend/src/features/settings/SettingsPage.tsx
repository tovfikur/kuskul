import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  School as SchoolIcon,
  People as PeopleIcon,
  Group as GroupIcon,
  Book as BookIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { api } from "../../api/client";
import { showToast } from "../../app/toast";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 4.2 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // School Profile Settings
  const [schoolProfile, setSchoolProfile] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    website: "",
    email: "",
    logo_url: "",
    established_year: "",
    school_type: "secondary",
    motto: "",
  });

  // Student Settings (already implemented in backend)
  const [studentSettings, setStudentSettings] = useState({
    auto_generate_admission_no: true,
    admission_no_prefix: "STU",
    admission_no_start_from: 1001,
    require_admission_approval: true,
    include_photo_on_id_card: true,
    include_barcode_on_id_card: true,
    id_card_validity_years: 1,
    default_student_status: "active",
    allow_multiple_enrollments: false,
    track_student_history: true,
    enable_student_portal: true,
    enable_parent_portal: true,
    send_credentials_on_creation: true,
    default_fee_category: "general",
    require_fee_clearance_for_promotion: false,
    enable_rfid_tracking: false,
    enable_biometric_attendance: false,
    require_vaccination_records: false,
  });

  // Staff Settings
  const [staffSettings, setStaffSettings] = useState({
    auto_generate_employee_id: true,
    employee_id_prefix: "EMP",
    employee_id_start_from: 1001,
    default_working_hours: 8,
    late_arrival_threshold: 15,
    enable_overtime_tracking: true,
    annual_leave_days: 21,
    sick_leave_days: 14,
    casual_leave_days: 10,
    require_leave_approval: true,
  });

  // Academic Settings
  const [academicSettings, setAcademicSettings] = useState({
    term_system: "semester",
    grading_scale: "percentage",
    pass_percentage: 40,
    grade_calculation_method: "weighted",
    allow_online_exams: true,
    auto_publish_results: false,
    result_approval_required: true,
  });

  // Email & SMS Settings
  const [emailSmsSettings, setEmailSmsSettings] = useState({
    smtp_server: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    from_email: "",
    from_name: "",
    sms_gateway_provider: "twilio",
    sms_api_key: "",
    sms_sender_id: "",
    send_welcome_emails: true,
    send_attendance_alerts: true,
    send_fee_reminders: true,
    send_exam_reminders: true,
  });

  // Backup & Security Settings
  const [backupSecuritySettings, setBackupSecuritySettings] = useState({
    enable_auto_backup: true,
    backup_frequency: "daily",
    backup_time: "02:00",
    retention_period_days: 30,
    password_min_length: 8,
    password_complexity_required: true,
    max_login_attempts: 5,
    account_lockout_duration: 30,
    enable_ip_whitelisting: false,
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    timezone: "Asia/Dhaka",
    date_format: "DD/MM/YYYY",
    time_format: "12hr",
    currency_symbol: "৳",
    language: "en",
    session_timeout: 30,
    max_upload_size: 10,
    enable_audit_logging: true,
    enable_2fa: false,
  });

  useEffect(() => {
    loadAllSettings();
  }, []);

  async function loadAllSettings() {
    setLoading(true);
    try {
      // Load school profile
      const profileResp = await api.get("/settings");
      const profileData = profileResp.data as Array<{ key: string; value: string }>;
      const profileMap = new Map(profileData.map((r) => [r.key, r.value]));
      
      setSchoolProfile({
        name: profileMap.get("school.profile.name") || "",
        code: profileMap.get("school.profile.code") || "",
        address: profileMap.get("school.profile.address") || "",
        phone: profileMap.get("school.profile.phone") || "",
        website: profileMap.get("school.profile.website") || "",
        email: profileMap.get("school.profile.email") || "",
        logo_url: profileMap.get("school.profile.logo_url") || "",
        established_year: profileMap.get("school.profile.established_year") || "",
        school_type: profileMap.get("school.profile.school_type") || "secondary",
        motto: profileMap.get("school.profile.motto") || "",
      });

      // Load student settings
      try {
        const studentResp = await api.get("/settings/students.settings");
        if (studentResp.data && studentResp.data.value && studentResp.data.value.trim()) {
          setStudentSettings(JSON.parse(studentResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load student settings:", err);
        }
      }

      // Load staff settings
      try {
        const staffResp = await api.get("/settings/staff.settings");
        if (staffResp.data && staffResp.data.value && staffResp.data.value.trim()) {
          setStaffSettings(JSON.parse(staffResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load staff settings:", err);
        }
      }

      // Load academic settings
      try {
        const academicResp = await api.get("/settings/academic.settings");
        if (academicResp.data && academicResp.data.value && academicResp.data.value.trim()) {
          setAcademicSettings(JSON.parse(academicResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load academic settings:", err);
        }
      }

      // Load email/SMS settings
      try {
        const emailSmsResp = await api.get("/settings/email_sms.settings");
        if (emailSmsResp.data && emailSmsResp.data.value && emailSmsResp.data.value.trim()) {
          setEmailSmsSettings(JSON.parse(emailSmsResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load email/SMS settings:", err);
        }
      }

      // Load backup/security settings
      try {
        const backupResp = await api.get("/settings/backup_security.settings");
        if (backupResp.data && backupResp.data.value && backupResp.data.value.trim()) {
          setBackupSecuritySettings(JSON.parse(backupResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load backup/security settings:", err);
        }
      }

      // Load system settings
      try {
        const systemResp = await api.get("/settings/system.settings");
        if (systemResp.data && systemResp.data.value && systemResp.data.value.trim()) {
          setSystemSettings(JSON.parse(systemResp.data.value));
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.error("Failed to load system settings:", err);
        }
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error loading settings:", error);
      showToast({
        severity: "error",
        message: "Failed to load settings",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      if (currentTab === 0) {
        // Save school profile
        await Promise.all([
          api.put("/settings/school.profile.name", { value: schoolProfile.name }),
          api.put("/settings/school.profile.code", { value: schoolProfile.code }),
          api.put("/settings/school.profile.address", { value: schoolProfile.address }),
          api.put("/settings/school.profile.phone", { value: schoolProfile.phone }),
          api.put("/settings/school.profile.website", { value: schoolProfile.website }),
          api.put("/settings/school.profile.email", { value: schoolProfile.email }),
          api.put("/settings/school.profile.logo_url", { value: schoolProfile.logo_url }),
          api.put("/settings/school.profile.established_year", { value: schoolProfile.established_year }),
          api.put("/settings/school.profile.school_type", { value: schoolProfile.school_type }),
          api.put("/settings/school.profile.motto", { value: schoolProfile.motto }),
        ]);
      } else if (currentTab === 1) {
        // Save student settings
        await api.put("/settings/students.settings", {
          value: JSON.stringify(studentSettings),
        });
      } else if (currentTab === 2) {
        // Save staff settings
        await api.put("/settings/staff.settings", {
          value: JSON.stringify(staffSettings),
        });
      } else if (currentTab === 3) {
        // Save academic settings
        await api.put("/settings/academic.settings", {
          value: JSON.stringify(academicSettings),
        });
      } else if (currentTab === 4) {
        // Save system settings
        await api.put("/settings/system.settings", {
          value: JSON.stringify(systemSettings),
        });
      } else if (currentTab === 5) {
        // Save email/SMS settings
        await api.put("/settings/email_sms.settings", {
          value: JSON.stringify(emailSmsSettings),
        });
      } else if (currentTab === 6) {
        // Save backup/security settings
        await api.put("/settings/backup_security.settings", {
          value: JSON.stringify(backupSecuritySettings),
        });
      }

      showToast({
        severity: "success",
        message: "Settings saved successfully",
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      showToast({
        severity: "error",
        message: "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Do you want to discard them?")) {
        setCurrentTab(newValue);
        setHasChanges(false);
      }
    } else {
      setCurrentTab(newValue);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header - Golden Ratio spacing */}
      <Box sx={{ mb: 6.8 }}>
        <Typography variant="h3" fontWeight={800} gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage all system settings and configurations
        </Typography>
      </Box>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 4.2, borderRadius: 2 }}>
          You have unsaved changes. Click "Save Settings" to apply them.
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4.2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              minHeight: 68,
              fontSize: "0.95rem",
              fontWeight: 600,
              textTransform: "none",
            },
          }}
        >
          <Tab icon={<SchoolIcon />} label="School Profile" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="Students" iconPosition="start" />
          <Tab icon={<GroupIcon />} label="Staff" iconPosition="start" />
          <Tab icon={<BookIcon />} label="Academic" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="System" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="Email & SMS" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="Backup & Security" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      
      {/* School Profile Tab */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={4.2}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="School Name"
                  value={schoolProfile.name}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, name: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="School Code"
                  value={schoolProfile.code}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, code: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Address"
                  value={schoolProfile.address}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, address: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  multiline
                  rows={3}
                />
                
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={schoolProfile.phone}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, phone: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Email"
                  value={schoolProfile.email}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, email: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="email"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Additional Details
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Website URL"
                  value={schoolProfile.website}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, website: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  placeholder="https://example.com"
                />
                
                <TextField
                  fullWidth
                  label="Logo URL"
                  value={schoolProfile.logo_url}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, logo_url: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Established Year"
                  value={schoolProfile.established_year}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, established_year: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>School Type</InputLabel>
                  <Select
                    value={schoolProfile.school_type}
                    label="School Type"
                    onChange={(e) => {
                      setSchoolProfile({ ...schoolProfile, school_type: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="primary">Primary School</MenuItem>
                    <MenuItem value="secondary">Secondary School</MenuItem>
                    <MenuItem value="higher_secondary">Higher Secondary</MenuItem>
                    <MenuItem value="college">College</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Motto/Tagline"
                  value={schoolProfile.motto}
                  onChange={(e) => {
                    setSchoolProfile({ ...schoolProfile, motto: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  multiline
                  rows={2}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Student Settings Tab */}
      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={4.2}>
          {/* Admission Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2.6 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
                    Admission Settings
                  </Typography>
                  <Tooltip title="Configure how student admissions are managed">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.auto_generate_admission_no}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, auto_generate_admission_no: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Auto-generate Admission Numbers"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Automatically assign admission numbers to new students
                </Typography>
                
                <TextField
                  fullWidth
                  label="Admission Number Prefix"
                  value={studentSettings.admission_no_prefix}
                  onChange={(e) => {
                    setStudentSettings({ ...studentSettings, admission_no_prefix: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="e.g., STU, ADM, 2024"
                />
                
                <TextField
                  fullWidth
                  label="Start Numbering From"
                  value={studentSettings.admission_no_start_from}
                  onChange={(e) => {
                    setStudentSettings({ ...studentSettings, admission_no_start_from: parseInt(e.target.value) || 1001 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  helperText="Starting number for auto-generation"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.require_admission_approval}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, require_admission_approval: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Require Admission Approval"
                  sx={{ mt: 1.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  New admissions must be approved before becoming active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* ID Card Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ID Card Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.include_photo_on_id_card}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, include_photo_on_id_card: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Include Photo on ID Card"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Student photos will be printed on ID cards
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.include_barcode_on_id_card}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, include_barcode_on_id_card: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Include Barcode/QR Code"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Add scannable barcode/QR code for quick identification
                </Typography>
                
                <TextField
                  fullWidth
                  label="ID Card Validity (Years)"
                  value={studentSettings.id_card_validity_years}
                  onChange={(e) => {
                    setStudentSettings({ ...studentSettings, id_card_validity_years: parseInt(e.target.value) || 1 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 10 }}
                  helperText="How many years the ID card remains valid"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Academic Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Academic Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Default Student Status</InputLabel>
                  <Select
                    value={studentSettings.default_student_status}
                    label="Default Student Status"
                    onChange={(e) => {
                      setStudentSettings({ ...studentSettings, default_student_status: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.allow_multiple_enrollments}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, allow_multiple_enrollments: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Allow Multiple Enrollments"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Allow students to enroll in multiple classes simultaneously
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.track_student_history}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, track_student_history: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Track Student History"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Maintain historical records of student data changes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Portal Access Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Portal Access
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.enable_student_portal}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, enable_student_portal: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Student Portal Access"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Allow students to access their portal
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.enable_parent_portal}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, enable_parent_portal: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Parent Portal Access"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Allow parents/guardians to access the parent portal
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.send_credentials_on_creation}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, send_credentials_on_creation: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Send Login Credentials on Creation"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Automatically email login credentials when creating accounts
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Fee Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Fee Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Default Fee Category</InputLabel>
                  <Select
                    value={studentSettings.default_fee_category}
                    label="Default Fee Category"
                    onChange={(e) => {
                      setStudentSettings({ ...studentSettings, default_fee_category: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="day_scholar">Day Scholar</MenuItem>
                    <MenuItem value="boarding">Boarding</MenuItem>
                    <MenuItem value="scholarship">Scholarship</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.require_fee_clearance_for_promotion}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, require_fee_clearance_for_promotion: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Require Fee Clearance for Promotion"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Students must clear all fees before promotion to next class
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Advanced Features */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Advanced Features
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.enable_rfid_tracking}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, enable_rfid_tracking: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable RFID/NFC Tracking"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Track students using RFID/NFC cards
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.enable_biometric_attendance}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, enable_biometric_attendance: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Biometric Attendance"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Use biometric devices for attendance marking
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={studentSettings.require_vaccination_records}
                      onChange={(e) => {
                        setStudentSettings({ ...studentSettings, require_vaccination_records: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Require Vaccination Records"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Make vaccination status mandatory for student registration
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Staff Settings Tab */}
      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={4.2}>
          {/* Employee ID Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Employee ID Generation
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={staffSettings.auto_generate_employee_id}
                      onChange={(e) => {
                        setStaffSettings({ ...staffSettings, auto_generate_employee_id: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Auto-generate Employee IDs"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Automatically assign employee IDs to new staff members
                </Typography>
                
                <TextField
                  fullWidth
                  label="Employee ID Prefix"
                  value={staffSettings.employee_id_prefix}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, employee_id_prefix: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="e.g., EMP, STAFF, 2024"
                />
                
                <TextField
                  fullWidth
                  label="Start Numbering From"
                  value={staffSettings.employee_id_start_from}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, employee_id_start_from: parseInt(e.target.value) || 1001 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  helperText="Starting number for auto-generation"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Attendance Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Attendance Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Default Working Hours"
                  value={staffSettings.default_working_hours}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, default_working_hours: parseInt(e.target.value) || 8 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 12 }}
                  helperText="Standard working hours per day"
                />
                
                <TextField
                  fullWidth
                  label="Late Arrival Threshold (minutes)"
                  value={staffSettings.late_arrival_threshold}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, late_arrival_threshold: parseInt(e.target.value) || 15 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 60 }}
                  helperText="Mark as late if arrival exceeds this"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={staffSettings.enable_overtime_tracking}
                      onChange={(e) => {
                        setStaffSettings({ ...staffSettings, enable_overtime_tracking: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Overtime Tracking"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Track and calculate overtime hours for staff
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Leave Management */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Leave Management
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Annual Leave Days"
                  value={staffSettings.annual_leave_days}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, annual_leave_days: parseInt(e.target.value) || 21 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 0, max: 365 }}
                />
                
                <TextField
                  fullWidth
                  label="Sick Leave Days"
                  value={staffSettings.sick_leave_days}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, sick_leave_days: parseInt(e.target.value) || 14 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 0, max: 365 }}
                />
                
                <TextField
                  fullWidth
                  label="Casual Leave Days"
                  value={staffSettings.casual_leave_days}
                  onChange={(e) => {
                    setStaffSettings({ ...staffSettings, casual_leave_days: parseInt(e.target.value) || 10 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 0, max: 365 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={staffSettings.require_leave_approval}
                      onChange={(e) => {
                        setStaffSettings({ ...staffSettings, require_leave_approval: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Require Leave Approval"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Leave requests must be approved by supervisor
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Academic Settings Tab */}
      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={4.2}>
          {/* Grading System */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Grading System
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Grading Scale</InputLabel>
                  <Select
                    value={academicSettings.grading_scale}
                    label="Grading Scale"
                    onChange={(e) => {
                      setAcademicSettings({ ...academicSettings, grading_scale: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="percentage">Percentage (0-100)</MenuItem>
                    <MenuItem value="cgpa">CGPA (0-4.0)</MenuItem>
                    <MenuItem value="letter">Letter Grade (A-F)</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Pass Percentage"
                  value={academicSettings.pass_percentage}
                  onChange={(e) => {
                    setAcademicSettings({ ...academicSettings, pass_percentage: parseInt(e.target.value) || 40 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  helperText="Minimum percentage required to pass"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Grade Calculation Method</InputLabel>
                  <Select
                    value={academicSettings.grade_calculation_method}
                    label="Grade Calculation Method"
                    onChange={(e) => {
                      setAcademicSettings({ ...academicSettings, grade_calculation_method: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="weighted">Weighted Average</MenuItem>
                    <MenuItem value="simple">Simple Average</MenuItem>
                    <MenuItem value="best_of">Best Of (highest scores)</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Term System & Exams */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Academic Structure
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Term System</InputLabel>
                  <Select
                    value={academicSettings.term_system}
                    label="Term System"
                    onChange={(e) => {
                      setAcademicSettings({ ...academicSettings, term_system: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="semester">Semester (2 terms/year)</MenuItem>
                    <MenuItem value="trimester">Trimester (3 terms/year)</MenuItem>
                    <MenuItem value="quarter">Quarter (4 terms/year)</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={academicSettings.allow_online_exams}
                      onChange={(e) => {
                        setAcademicSettings({ ...academicSettings, allow_online_exams: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Allow Online Exams"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Enable online exam functionality for students
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={academicSettings.auto_publish_results}
                      onChange={(e) => {
                        setAcademicSettings({ ...academicSettings, auto_publish_results: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Auto-publish Results"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Automatically publish results after all marks are entered
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={academicSettings.result_approval_required}
                      onChange={(e) => {
                        setAcademicSettings({ ...academicSettings, result_approval_required: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Result Approval Required"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Results must be approved before publication
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* System Settings Tab */}
      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={4.2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Regional Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Timezone"
                  value={systemSettings.timezone}
                  onChange={(e) => {
                    setSystemSettings({ ...systemSettings, timezone: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="e.g., Asia/Dhaka"
                />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Date Format</InputLabel>
                  <Select
                    value={systemSettings.date_format}
                    label="Date Format"
                    onChange={(e) => {
                      setSystemSettings({ ...systemSettings, date_format: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                    <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                    <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Time Format</InputLabel>
                  <Select
                    value={systemSettings.time_format}
                    label="Time Format"
                    onChange={(e) => {
                      setSystemSettings({ ...systemSettings, time_format: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="12hr">12 Hour (AM/PM)</MenuItem>
                    <MenuItem value="24hr">24 Hour</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Currency Symbol"
                  value={systemSettings.currency_symbol}
                  onChange={(e) => {
                    setSystemSettings({ ...systemSettings, currency_symbol: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="e.g., $, €, ৳"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  System Settings
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  value={systemSettings.session_timeout}
                  onChange={(e) => {
                    setSystemSettings({ ...systemSettings, session_timeout: parseInt(e.target.value) || 30 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 5, max: 120 }}
                />
                
                <TextField
                  fullWidth
                  label="Max Upload File Size (MB)"
                  value={systemSettings.max_upload_size}
                  onChange={(e) => {
                    setSystemSettings({ ...systemSettings, max_upload_size: parseInt(e.target.value) || 10 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 100 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.enable_audit_logging}
                      onChange={(e) => {
                        setSystemSettings({ ...systemSettings, enable_audit_logging: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Audit Logging"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Track all user actions for security and compliance
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={systemSettings.enable_2fa}
                      onChange={(e) => {
                        setSystemSettings({ ...systemSettings, enable_2fa: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Require 2FA for all user accounts
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Email & SMS Tab */}
      <TabPanel value={currentTab} index={5}>
        <Grid container spacing={4.2}>
          {/* Email Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Email Configuration (SMTP)
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="SMTP Server"
                  value={emailSmsSettings.smtp_server}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, smtp_server: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="e.g., smtp.gmail.com"
                />
                
                <TextField
                  fullWidth
                  label="SMTP Port"
                  value={emailSmsSettings.smtp_port}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, smtp_port: parseInt(e.target.value) || 587 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  helperText="Common: 587 (TLS), 465 (SSL)"
                />
                
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={emailSmsSettings.smtp_username}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, smtp_username: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="SMTP Password"
                  value={emailSmsSettings.smtp_password}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, smtp_password: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="password"
                />
                
                <TextField
                  fullWidth
                  label="From Email"
                  value={emailSmsSettings.from_email}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, from_email: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="email"
                />
                
                <TextField
                  fullWidth
                  label="From Name"
                  value={emailSmsSettings.from_name}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, from_name: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="Display name in emails"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* SMS Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  SMS Configuration
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>SMS Gateway Provider</InputLabel>
                  <Select
                    value={emailSmsSettings.sms_gateway_provider}
                    label="SMS Gateway Provider"
                    onChange={(e) => {
                      setEmailSmsSettings({ ...emailSmsSettings, sms_gateway_provider: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="twilio">Twilio</MenuItem>
                    <MenuItem value="nexmo">Nexmo</MenuItem>
                    <MenuItem value="msg91">MSG91</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="SMS API Key"
                  value={emailSmsSettings.sms_api_key}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, sms_api_key: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="password"
                />
                
                <TextField
                  fullWidth
                  label="SMS Sender ID"
                  value={emailSmsSettings.sms_sender_id}
                  onChange={(e) => {
                    setEmailSmsSettings({ ...emailSmsSettings, sms_sender_id: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  helperText="6 characters, e.g., SCHOOL"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Notification Preferences */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Notification Preferences
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSmsSettings.send_welcome_emails}
                      onChange={(e) => {
                        setEmailSmsSettings({ ...emailSmsSettings, send_welcome_emails: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Send Welcome Emails"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Send welcome emails to new users
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSmsSettings.send_attendance_alerts}
                      onChange={(e) => {
                        setEmailSmsSettings({ ...emailSmsSettings, send_attendance_alerts: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Send Attendance Alerts"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Notify parents of student absences
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSmsSettings.send_fee_reminders}
                      onChange={(e) => {
                        setEmailSmsSettings({ ...emailSmsSettings, send_fee_reminders: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Send Fee Reminders"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Send automatic fee payment reminders
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailSmsSettings.send_exam_reminders}
                      onChange={(e) => {
                        setEmailSmsSettings({ ...emailSmsSettings, send_exam_reminders: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Send Exam Reminders"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Remind students of upcoming exams
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Backup & Security Tab */}
      <TabPanel value={currentTab} index={6}>
        <Grid container spacing={4.2}>
          {/* Backup Configuration */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Automatic Backup
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupSecuritySettings.enable_auto_backup}
                      onChange={(e) => {
                        setBackupSecuritySettings({ ...backupSecuritySettings, enable_auto_backup: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable Automatic Backup"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Automatically backup database on schedule
                </Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel>Backup Frequency</InputLabel>
                  <Select
                    value={backupSecuritySettings.backup_frequency}
                    label="Backup Frequency"
                    onChange={(e) => {
                      setBackupSecuritySettings({ ...backupSecuritySettings, backup_frequency: e.target.value });
                      setHasChanges(true);
                    }}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Backup Time"
                  value={backupSecuritySettings.backup_time}
                  onChange={(e) => {
                    setBackupSecuritySettings({ ...backupSecuritySettings, backup_time: e.target.value });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="time"
                  helperText="Time to run daily backup"
                />
                
                <TextField
                  fullWidth
                  label="Retention Period (days)"
                  value={backupSecuritySettings.retention_period_days}
                  onChange={(e) => {
                    setBackupSecuritySettings({ ...backupSecuritySettings, retention_period_days: parseInt(e.target.value) || 30 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 365 }}
                  helperText="How long to keep backups"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 4.2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Password Policy
                </Typography>
                <Divider sx={{ mb: 2.6 }} />
                
                <TextField
                  fullWidth
                  label="Password Minimum Length"
                  value={backupSecuritySettings.password_min_length}
                  onChange={(e) => {
                    setBackupSecuritySettings({ ...backupSecuritySettings, password_min_length: parseInt(e.target.value) || 8 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 6, max: 32 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupSecuritySettings.password_complexity_required}
                      onChange={(e) => {
                        setBackupSecuritySettings({ ...backupSecuritySettings, password_complexity_required: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Require Password Complexity"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.6, ml: 4 }}>
                  Require uppercase, lowercase, numbers, and special characters
                </Typography>
                
                <TextField
                  fullWidth
                  label="Max Login Attempts"
                  value={backupSecuritySettings.max_login_attempts}
                  onChange={(e) => {
                    setBackupSecuritySettings({ ...backupSecuritySettings, max_login_attempts: parseInt(e.target.value) || 5 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 1, max: 10 }}
                  helperText="Lock account after this many failed attempts"
                />
                
                <TextField
                  fullWidth
                  label="Account Lockout Duration (minutes)"
                  value={backupSecuritySettings.account_lockout_duration}
                  onChange={(e) => {
                    setBackupSecuritySettings({ ...backupSecuritySettings, account_lockout_duration: parseInt(e.target.value) || 30 });
                    setHasChanges(true);
                  }}
                  margin="normal"
                  type="number"
                  inputProps={{ min: 5, max: 1440 }}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupSecuritySettings.enable_ip_whitelisting}
                      onChange={(e) => {
                        setBackupSecuritySettings({ ...backupSecuritySettings, enable_ip_whitelisting: e.target.checked });
                        setHasChanges(true);
                      }}
                    />
                  }
                  label="Enable IP Whitelisting"
                  sx={{ mt: 2.6 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                  Only allow access from specific IP addresses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Action Buttons - Fixed at bottom with golden ratio spacing */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          backgroundColor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          mt: 6.8,
          py: 2.6,
          px: 4.2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <Button
          startIcon={<RefreshIcon />}
          onClick={loadAllSettings}
          disabled={saving}
          sx={{ borderRadius: 2 }}
        >
          Reset Changes
        </Button>
        
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={saveSettings}
          disabled={saving || !hasChanges}
          sx={{ borderRadius: 2, px: 4.2, py: 1.6 }}
          size="large"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </Box>
    </Box>
  );
}
