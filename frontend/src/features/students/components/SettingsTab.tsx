import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  Divider,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  Save,
  Settings as SettingsIcon,
  Badge,
  School,
  AttachMoney,
  Refresh,
  Security,
} from "@mui/icons-material";
import { showToast } from "../../../app/toast";
import { api } from "../../../api/client";

type StudentSettings = {
  auto_generate_admission_no: boolean;
  admission_no_prefix: string;
  admission_no_start_from: number;
  require_admission_approval: boolean;
  include_photo_on_id_card: boolean;
  include_barcode_on_id_card: boolean;
  id_card_validity_years: number;
  default_student_status: string;
  allow_multiple_enrollments: boolean;
  track_student_history: boolean;
  enable_student_portal: boolean;
  enable_parent_portal: boolean;
  send_credentials_on_creation: boolean;
  default_fee_category: string;
  require_fee_clearance_for_promotion: boolean;
  enable_rfid_tracking: boolean;
  enable_biometric_attendance: boolean;
  require_vaccination_records: boolean;
};

const defaultSettings: StudentSettings = {
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
};

export default function SettingsTab() {
  const [settings, setSettings] = useState<StudentSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await api.get("/settings/students.settings");
      if (response.data && response.data.value && response.data.value.trim() !== "") {
        const loadedSettings = JSON.parse(response.data.value);
        setSettings(loadedSettings);
      }
      // If value is empty, keep using defaultSettings
    } catch (err: any) {
      console.error("Failed to load settings:", err);
      showToast({ 
        severity: "error", 
        message: "Failed to load settings. Using defaults." 
      });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key: keyof StudentSettings, value: any) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/settings/students.settings", {
        value: JSON.stringify(settings),
      });
      showToast({
        severity: "success",
        message: "Settings saved successfully",
      });
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSettings(defaultSettings);
    setHasChanges(true);
    showToast({ severity: "info", message: "Settings reset to defaults" });
  }

  return (
    <Box>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Header - Golden Ratio Spacing */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Student Management Settings
            </Typography>
            <Typography color="text.secondary" variant="body1">
              Configure how student data is managed in your school
            </Typography>
          </Box>

          {hasChanges && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              You have unsaved changes. Click "Save Settings" to apply them.
            </Alert>
          )}

      <Grid container spacing={3}>
        {/* Admission Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Badge sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  Admission Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.auto_generate_admission_no}
                        onChange={(e) =>
                          handleChange("auto_generate_admission_no", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Auto-generate Admission Numbers
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Automatically assign admission numbers to new students
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12} sm={6}>
                  <TextField
                    label="Admission Number Prefix"
                    value={settings.admission_no_prefix}
                    onChange={(e) => handleChange("admission_no_prefix", e.target.value)}
                    fullWidth
                    helperText="e.g., STU, ADM, or year-based like 2024"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                
                <Grid container item xs={12} sm={6}>
                  <TextField
                    label="Start Numbering From"
                    type="number"
                    value={settings.admission_no_start_from}
                    onChange={(e) =>
                      handleChange("admission_no_start_from", parseInt(e.target.value) || 1001)
                    }
                    fullWidth
                    helperText="First admission number to assign"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.require_admission_approval}
                        onChange={(e) =>
                          handleChange("require_admission_approval", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Require Admission Approval
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          New admissions must be approved before student becomes active
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* ID Card Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <School sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  ID Card Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.include_photo_on_id_card}
                        onChange={(e) =>
                          handleChange("include_photo_on_id_card", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Include Photo on ID Card
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Student photos will be printed on ID cards
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.include_barcode_on_id_card}
                        onChange={(e) =>
                          handleChange("include_barcode_on_id_card", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Include Barcode/QR Code on ID Card
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Add scannable barcode for quick identification
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12} sm={6}>
                  <TextField
                    label="ID Card Validity (Years)"
                    type="number"
                    value={settings.id_card_validity_years}
                    onChange={(e) =>
                      handleChange("id_card_validity_years", parseInt(e.target.value) || 1)
                    }
                    fullWidth
                    inputProps={{ min: 1, max: 10 }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Academic Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <SettingsIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  Academic Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Student Status</InputLabel>
                    <Select
                      value={settings.default_student_status}
                      label="Default Student Status"
                      onChange={(e) => handleChange("default_student_status", e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.allow_multiple_enrollments}
                        onChange={(e) =>
                          handleChange("allow_multiple_enrollments", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Allow Multiple Simultaneous Enrollments
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow a student to be enrolled in multiple classes at the same time
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.track_student_history}
                        onChange={(e) => handleChange("track_student_history", e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Track Student History
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Maintain historical records of class changes and status updates
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Portal Access Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Security sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  Portal Access Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_student_portal}
                        onChange={(e) => handleChange("enable_student_portal", e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Enable Student Portal Access
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow students to access the online portal
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_parent_portal}
                        onChange={(e) => handleChange("enable_parent_portal", e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Enable Parent Portal Access
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Allow parents/guardians to access the online portal
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.send_credentials_on_creation}
                        onChange={(e) =>
                          handleChange("send_credentials_on_creation", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Send Login Credentials on Creation
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Automatically email portal credentials when creating new students
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Fee Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <AttachMoney sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  Fee Settings
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Fee Category</InputLabel>
                    <Select
                      value={settings.default_fee_category}
                      label="Default Fee Category"
                      onChange={(e) => handleChange("default_fee_category", e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="general">General</MenuItem>
                      <MenuItem value="day_scholar">Day Scholar</MenuItem>
                      <MenuItem value="boarding">Boarding</MenuItem>
                      <MenuItem value="scholarship">Scholarship</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.require_fee_clearance_for_promotion}
                        onChange={(e) =>
                          handleChange("require_fee_clearance_for_promotion", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Require Fee Clearance for Promotion
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Students must clear all dues before being promoted to next class
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Settings */}
        <Grid container item xs={12}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <SettingsIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" fontWeight={700}>
                  Advanced Features
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_rfid_tracking}
                        onChange={(e) => handleChange("enable_rfid_tracking", e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Enable RFID/NFC Tracking
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Track student attendance and movement using RFID/NFC cards
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enable_biometric_attendance}
                        onChange={(e) =>
                          handleChange("enable_biometric_attendance", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Enable Biometric Attendance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Use fingerprint or face recognition for student attendance
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid container item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.require_vaccination_records}
                        onChange={(e) =>
                          handleChange("require_vaccination_records", e.target.checked)
                        }
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          Require Vaccination Records
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Make vaccination status mandatory for student enrollment
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Action Buttons - Golden Ratio Spacing */}
        <Grid container item xs={12}>
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              p: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "grey.50",
            }}
          >
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReset}
                disabled={saving}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                sx={{ borderRadius: 2, px: 4 }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
        </>
      )}
    </Box>
  );
}
