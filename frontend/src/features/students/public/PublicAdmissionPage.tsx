import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  Description,
  Person,
  PhotoCamera,
  School,
} from "@mui/icons-material";

import {
  getPublicAdmissionConfig,
  submitPublicAdmission,
  type PublicAdmissionConfig,
  type PublicAdmissionResult,
} from "../../../api/admissions";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export default function PublicAdmissionPage() {
  const { token } = useParams<{ token: string }>();
  const [config, setConfig] = useState<PublicAdmissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [result, setResult] = useState<PublicAdmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("Bangladeshi");
  const [religion, setReligion] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [medium, setMedium] = useState("English");
  const [shift, setShift] = useState("Morning");
  const [previousSchool, setPreviousSchool] = useState("");
  const [previousClass, setPreviousClass] = useState("");

  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");
  const [fatherNID, setFatherNID] = useState("");

  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");
  const [motherNID, setMotherNID] = useState("");

  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);
  const [transferCertificate, setTransferCertificate] = useState<File | null>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [website, setWebsite] = useState("");

  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (!token) {
      setLoadError("This admission link is invalid.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getPublicAdmissionConfig(token)
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setLoadError("This admission link is invalid, disabled, or no longer available.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!studentPhoto) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(studentPhoto);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [studentPhoto]);

  const sections = useMemo(() => {
    return config?.classes.find((item) => item.id === classId)?.sections ?? [];
  }, [classId, config]);

  useEffect(() => {
    setSectionId("");
  }, [classId]);

  useEffect(() => {
    if (result) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [result]);

  function validate(): string {
    if (!firstName.trim()) return "Student first name is required.";
    if (!gender) return "Student gender is required.";
    if (!dateOfBirth) return "Student date of birth is required.";
    if (!classId) return "Please select a class.";
    if (!sectionId) return "Please select a section.";
    if (!fatherName.trim()) return "Parent or guardian name is required.";
    if (!fatherPhone.trim()) return "Parent or guardian phone number is required.";
    const motherAny = [
      motherName,
      motherPhone,
      motherEmail,
      motherOccupation,
      motherNID,
    ].some((value) => value.trim());
    if (motherAny && (!motherName.trim() || !motherPhone.trim())) {
      return "Mother's name and phone number are required when mother details are entered.";
    }
    if (!declarationAccepted) return "Please confirm that the information is accurate.";
    if (studentPhoto && studentPhoto.size > MAX_PHOTO_BYTES) {
      return "Student photo must be 2 MB or smaller.";
    }
    if (birthCertificate && birthCertificate.size > MAX_DOCUMENT_BYTES) {
      return "Birth certificate must be 5 MB or smaller.";
    }
    if (transferCertificate && transferCertificate.size > MAX_DOCUMENT_BYTES) {
      return "Transfer certificate must be 5 MB or smaller.";
    }
    return "";
  }

  function validateStep(step: number): string {
    if (step === 0) {
      if (!firstName.trim()) return "Student first name is required.";
      if (!gender) return "Student gender is required.";
      if (!dateOfBirth) return "Student date of birth is required.";
    }
    if (step === 1) {
      if (!classId) return "Please select a class.";
      if (!sectionId) return "Please select a section.";
    }
    if (step === 2) {
      if (!fatherName.trim()) return "Parent or guardian name is required.";
      if (!fatherPhone.trim()) return "Parent or guardian phone number is required.";
    }
    if (step === 3 && !declarationAccepted) {
      return "Please confirm that the information is accurate.";
    }
    return "";
  }

  async function handleSubmit() {
    if (!token || !config) return;
    const error = validate();
    if (error) {
      setFormError(error);
      if (!firstName.trim() || !gender || !dateOfBirth) setActiveTab(0);
      else if (!classId || !sectionId) setActiveTab(1);
      else if (!fatherName.trim() || !fatherPhone.trim()) setActiveTab(2);
      else setActiveTab(3);
      return;
    }

    setSubmitting(true);
    setFormError("");
    const motherAny = [
      motherName,
      motherPhone,
      motherEmail,
      motherOccupation,
      motherNID,
    ].some((value) => value.trim());

    try {
      const response = await submitPublicAdmission(
        token,
        {
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          gender,
          date_of_birth: dateOfBirth,
          nationality: nationality.trim() || null,
          religion: religion.trim() || null,
          blood_group: bloodGroup || null,
          present_address: presentAddress.trim() || null,
          city: city.trim() || null,
          postal_code: postalCode.trim() || null,
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
          class_id: classId,
          section_id: sectionId,
          medium: medium || null,
          shift: shift || null,
          previous_school_name: previousSchool.trim() || null,
          previous_class: previousClass.trim() || null,
          father: {
            full_name: fatherName.trim(),
            phone: fatherPhone.trim(),
            email: fatherEmail.trim() || null,
            occupation: fatherOccupation.trim() || null,
            id_number: fatherNID.trim() || null,
          },
          mother: motherAny
            ? {
                full_name: motherName.trim(),
                phone: motherPhone.trim(),
                email: motherEmail.trim() || null,
                occupation: motherOccupation.trim() || null,
                id_number: motherNID.trim() || null,
              }
            : null,
          declaration_accepted: declarationAccepted,
          website: website.trim() || null,
        },
        {
          photo: studentPhoto,
          birthCertificate,
          transferCertificate,
        },
      );
      setResult(response);
    } catch (err) {
      console.error(err);
      setFormError("We could not submit the application. Please check the details and try again.");
      setActiveTab(3);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setResult(null);
    setFormError("");
    setActiveTab(0);
    setFileInputKey((value) => value + 1);
    setFirstName("");
    setLastName("");
    setGender("");
    setDateOfBirth("");
    setNationality("Bangladeshi");
    setReligion("");
    setBloodGroup("");
    setPresentAddress("");
    setCity("");
    setPostalCode("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setStudentPhoto(null);
    setClassId("");
    setSectionId("");
    setMedium("English");
    setShift("Morning");
    setPreviousSchool("");
    setPreviousClass("");
    setFatherName("");
    setFatherPhone("");
    setFatherEmail("");
    setFatherOccupation("");
    setFatherNID("");
    setMotherName("");
    setMotherPhone("");
    setMotherEmail("");
    setMotherOccupation("");
    setMotherNID("");
    setBirthCertificate(null);
    setTransferCertificate(null);
    setDeclarationAccepted(false);
    setWebsite("");
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "grey.50" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !config) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "grey.50", p: 2 }}>
        <Paper sx={{ p: 4, maxWidth: 520, borderRadius: 3 }} elevation={0}>
          <Alert severity="error">{loadError || "Admission form is not available."}</Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" spacing={2.5} alignItems="center">
              {config.school.logo_url ? (
                <Box
                  component="img"
                  src={config.school.logo_url}
                  alt={config.school.name}
                  sx={{ width: 64, height: 64, objectFit: "contain", borderRadius: 2 }}
                />
              ) : (
                <Avatar sx={{ width: 64, height: 64, bgcolor: "primary.main" }}>
                  <School sx={{ fontSize: 34 }} />
                </Avatar>
              )}
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {config.school.name}
                </Typography>
                <Typography color="text.secondary">
                  Student Admission Application
                </Typography>
                {config.academic_year && (
                  <Typography variant="caption" color="text.secondary">
                    Academic year: {config.academic_year.name}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>

          {result ? (
            <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <Stack spacing={2.5} alignItems="center" textAlign="center">
                <CheckCircle color="success" sx={{ fontSize: 72 }} />
                <Typography variant="h4" fontWeight={700}>
                  Application received
                </Typography>
                <Typography color="text.secondary" maxWidth={560}>
                  {result.message}
                </Typography>
                <Paper variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, bgcolor: "grey.50" }}>
                  <Typography variant="overline" color="text.secondary">
                    Application reference
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {result.reference}
                  </Typography>
                </Paper>
                <Button variant="outlined" onClick={resetForm}>
                  Submit another application
                </Button>
              </Stack>
            </Paper>
          ) : !config.admission_open ? (
            <Alert severity="info">
              Admissions are currently closed. Please contact the school office for assistance.
            </Alert>
          ) : (
            <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
              <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, value) => {
                    const error = validateStep(activeTab);
                    if (error) {
                      setFormError(error);
                      return;
                    }
                    setFormError("");
                    setActiveTab(value);
                  }}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab icon={<Person />} iconPosition="start" label="Student" />
                  <Tab icon={<School />} iconPosition="start" label="Academic" />
                  <Tab icon={<Person />} iconPosition="start" label="Guardian" />
                  <Tab icon={<Description />} iconPosition="start" label="Documents" />
                </Tabs>
              </Box>

              <Box sx={{ p: { xs: 3, md: 4 } }}>
                {formError && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {formError}
                  </Alert>
                )}

                {activeTab === 0 && (
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "center" }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          Student Photo
                        </Typography>
                        <input
                          key={`photo-${fileInputKey}`}
                          accept="image/*"
                          style={{ display: "none" }}
                          id="public-student-photo"
                          type="file"
                          onChange={(event) => setStudentPhoto(event.target.files?.[0] ?? null)}
                        />
                        <label htmlFor="public-student-photo">
                          <Avatar
                            src={photoPreview}
                            sx={{
                              width: 150,
                              height: 150,
                              mx: "auto",
                              mb: 2,
                              cursor: "pointer",
                              border: "4px solid",
                              borderColor: "primary.light",
                            }}
                          >
                            <PhotoCamera sx={{ fontSize: 44 }} />
                          </Avatar>
                        </label>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Optional, up to 2 MB
                        </Typography>
                        {studentPhoto && (
                          <Typography variant="body2" sx={{ mt: 1, overflowWrap: "anywhere" }}>
                            {studentPhoto.name}
                          </Typography>
                        )}
                      </Paper>
                    </Grid>

                    <Grid container spacing={2} size={{ xs: 12, md: 8 }}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth required label="First Name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Last Name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required>
                          <InputLabel>Gender</InputLabel>
                          <Select label="Gender" value={gender} onChange={(event) => setGender(event.target.value)}>
                            <MenuItem value="male">Male</MenuItem>
                            <MenuItem value="female">Female</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          required
                          type="date"
                          label="Date of Birth"
                          value={dateOfBirth}
                          onChange={(event) => setDateOfBirth(event.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Nationality" value={nationality} onChange={(event) => setNationality(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Religion" value={religion} onChange={(event) => setReligion(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Blood Group</InputLabel>
                          <Select label="Blood Group" value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value)}>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                              <MenuItem key={group} value={group}>{group}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Postal Code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField fullWidth multiline minRows={2} label="Present Address" value={presentAddress} onChange={(event) => setPresentAddress(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="City" value={city} onChange={(event) => setCity(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Emergency Contact Name" value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Emergency Contact Phone" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} />
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {activeTab === 1 && (
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth required>
                        <InputLabel>Class</InputLabel>
                        <Select label="Class" value={classId} onChange={(event) => setClassId(event.target.value)}>
                          {config.classes.map((item) => (
                            <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth required disabled={!classId}>
                        <InputLabel>Section</InputLabel>
                        <Select label="Section" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
                          {sections.map((item) => (
                            <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Medium</InputLabel>
                        <Select label="Medium" value={medium} onChange={(event) => setMedium(event.target.value)}>
                          <MenuItem value="English">English</MenuItem>
                          <MenuItem value="Bangla">Bangla</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Shift</InputLabel>
                        <Select label="Shift" value={shift} onChange={(event) => setShift(event.target.value)}>
                          <MenuItem value="Morning">Morning</MenuItem>
                          <MenuItem value="Day">Day</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Previous School" value={previousSchool} onChange={(event) => setPreviousSchool(event.target.value)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField fullWidth label="Previous Class" value={previousClass} onChange={(event) => setPreviousClass(event.target.value)} />
                    </Grid>
                  </Grid>
                )}

                {activeTab === 2 && (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Parent / Guardian
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth required label="Full Name" value={fatherName} onChange={(event) => setFatherName(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth required label="Phone Number" value={fatherPhone} onChange={(event) => setFatherPhone(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Email" type="email" value={fatherEmail} onChange={(event) => setFatherEmail(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Occupation" value={fatherOccupation} onChange={(event) => setFatherOccupation(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="NID Number" value={fatherNID} onChange={(event) => setFatherNID(event.target.value)} />
                        </Grid>
                      </Grid>
                    </Box>

                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Mother
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Full Name" value={motherName} onChange={(event) => setMotherName(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Phone Number" value={motherPhone} onChange={(event) => setMotherPhone(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Email" type="email" value={motherEmail} onChange={(event) => setMotherEmail(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="Occupation" value={motherOccupation} onChange={(event) => setMotherOccupation(event.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField fullWidth label="NID Number" value={motherNID} onChange={(event) => setMotherNID(event.target.value)} />
                        </Grid>
                      </Grid>
                    </Box>
                  </Stack>
                )}

                {activeTab === 3 && (
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Supporting Documents
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <Typography fontWeight={600} gutterBottom>
                              Birth Certificate
                            </Typography>
                            <input
                              key={`birth-${fileInputKey}`}
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: "none" }}
                              id="public-birth-certificate"
                              type="file"
                              onChange={(event) => setBirthCertificate(event.target.files?.[0] ?? null)}
                            />
                            <label htmlFor="public-birth-certificate">
                              <Button variant="outlined" component="span">
                                Choose file
                              </Button>
                            </label>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: "anywhere" }}>
                              {birthCertificate?.name || "Optional, PDF or image up to 5 MB"}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                            <Typography fontWeight={600} gutterBottom>
                              Transfer Certificate
                            </Typography>
                            <input
                              key={`transfer-${fileInputKey}`}
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: "none" }}
                              id="public-transfer-certificate"
                              type="file"
                              onChange={(event) => setTransferCertificate(event.target.files?.[0] ?? null)}
                            />
                            <label htmlFor="public-transfer-certificate">
                              <Button variant="outlined" component="span">
                                Choose file
                              </Button>
                            </label>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: "anywhere" }}>
                              {transferCertificate?.name || "Optional, PDF or image up to 5 MB"}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ display: "none" }} aria-hidden="true">
                      <TextField
                        tabIndex={-1}
                        autoComplete="off"
                        label="Website"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={declarationAccepted}
                          onChange={(event) => setDeclarationAccepted(event.target.checked)}
                        />
                      }
                      label="I confirm that the information provided is accurate and may be used for the admission process."
                    />
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mt: 4 }}>
                  <Button
                    variant="outlined"
                    disabled={activeTab === 0 || submitting}
                    onClick={() => {
                      setFormError("");
                      setActiveTab((value) => Math.max(0, value - 1));
                    }}
                  >
                    Back
                  </Button>
                  <Stack direction="row" spacing={1.5}>
                    {activeTab < 3 && (
                      <Button
                        variant="outlined"
                        onClick={() => {
                          const error = validateStep(activeTab);
                          if (error) {
                            setFormError(error);
                            return;
                          }
                          setFormError("");
                          setActiveTab((value) => value + 1);
                        }}
                      >
                        Next
                      </Button>
                    )}
                    <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Application"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Paper>
          )}

          <Typography variant="caption" color="text.secondary" textAlign="center">
            Your information is submitted directly to {config.school.name}.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
