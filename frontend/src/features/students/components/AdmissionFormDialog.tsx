import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Divider,
  Avatar,
	  Alert,
	  Link,
	  Paper, // Added missing Paper import
} from "@mui/material";
import {
  Close,
  Person,
  School,
  People,
  PhotoCamera,
  Description,
  CheckCircle,
  Home,
  ContactPhone,
} from "@mui/icons-material";
import { showToast } from "../../../app/toast";
import {
  createStudent,
  createGuardian,
  createEnrollment,
  getNextEnrollmentRollNumber,
  uploadStudentPhoto,
  uploadStudentDocument,
  uploadGuardianPhoto,
  linkGuardianToStudent,
} from "../../../api/people";
import {
  getClasses,
  getSections,
  getCurrentAcademicYear,
  type SchoolClass,
  type Section,
  type AcademicYear,
} from "../../../api/academic";

interface AdmissionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdmissionFormDialog({
  open,
  onClose,
  onSuccess,
}: AdmissionFormDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
	  const [saving, setSaving] = useState(false);
	  const [classes, setClasses] = useState<SchoolClass[]>([]);
	  const [sections, setSections] = useState<Section[]>([]);
	  const [sectionsLoading, setSectionsLoading] = useState(false);
	  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);

  // Student Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
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
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string>("");

  // Academic Form
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [rollNumberLoading, setRollNumberLoading] = useState(false);
  const rollNumberManualRef = useRef(false);
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [medium, setMedium] = useState("English");
  const [shift, setShift] = useState("Morning");
  const [previousSchool, setPreviousSchool] = useState("");
  const [transferCertificate, setTransferCertificate] = useState<File | null>(null);
  const [birthCertificate, setBirthCertificate] = useState<File | null>(null);

  // Father Form
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [fatherEmail, setFatherEmail] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");
  const [fatherNID, setFatherNID] = useState("");
  const [fatherPhoto, setFatherPhoto] = useState<File | null>(null);

  // Mother Form
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [motherEmail, setMotherEmail] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");
		  const [motherNID, setMotherNID] = useState("");
  const [motherPhoto, setMotherPhoto] = useState<File | null>(null);

  function openSelectedFile(file: File | null) {
    if (!file) return;
    const url = window.URL.createObjectURL(file);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      showToast({ severity: "error", message: "Please allow popups to view this file" });
      window.URL.revokeObjectURL(url);
      return;
    }
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  }

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

	  useEffect(() => {
	    let cancelled = false;

	    setSectionId("");
	    setRollNumber("");
	    setSections([]);

	    if (!classId) {
	      setSectionsLoading(false);
	      return;
	    }

	    async function loadClassSections() {
	      setSectionsLoading(true);
	      try {
	        const data = await getSections(classId);
	        if (!cancelled) {
	          setSections(data.filter((s) => s.is_active));
	        }
	      } catch (err) {
	        console.error(err);
	        if (!cancelled) {
	          showToast({
	            severity: "error",
	            message: "Failed to load sections for selected class",
	          });
	        }
	      } finally {
	        if (!cancelled) {
	          setSectionsLoading(false);
	        }
	      }
	    }

	    loadClassSections();

	    return () => {
	      cancelled = true;
	    };
	  }, [classId]);

  useEffect(() => {
    let cancelled = false;

    async function loadNextRollNumber() {
      if (!currentYear?.id || !classId || !sectionId) {
        return;
      }
      if (rollNumberManualRef.current) {
        setRollNumberLoading(false);
        return;
      }

      setRollNumberLoading(true);
      try {
        const nextRollNumber = await getNextEnrollmentRollNumber({
          academic_year_id: currentYear.id,
          class_id: classId,
          section_id: sectionId,
        });
        if (!cancelled && !rollNumberManualRef.current) {
          setRollNumber(nextRollNumber);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setRollNumberLoading(false);
        }
      }
    }

    loadNextRollNumber();

    return () => {
      cancelled = true;
    };
  }, [classId, sectionId, currentYear?.id]);

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
      showToast({ severity: "error", message: "Failed to load initial data" });
    }
  }

	  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "student" | "father" | "mother",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "student") {
      setStudentPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStudentPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (type === "father") {
      setFatherPhoto(file);
    } else if (type === "mother") {
      setMotherPhoto(file);
    }
  }

  function resetForm() {
    setActiveTab(0);
    setFirstName("");
    setLastName("");
    setAdmissionNo("");
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
    setStudentPhotoPreview("");
    setClassId("");
    setSectionId("");
    setRollNumber("");
    rollNumberManualRef.current = false;
    setAdmissionDate(new Date().toISOString().split("T")[0]);
    setMedium("English");
    setShift("Morning");
    setPreviousSchool("");
    setTransferCertificate(null);
    setBirthCertificate(null);
    setFatherName("");
    setFatherPhone("");
    setFatherEmail("");
    setFatherOccupation("");
    setFatherNID("");
    setFatherPhoto(null);
    setMotherName("");
    setMotherPhone("");
    setMotherEmail("");
    setMotherOccupation("");
    setMotherNID("");
    setMotherPhoto(null);
  }

  async function handleSubmit() {
    if (!firstName.trim()) {
      showToast({ severity: "error", message: "First name is required" });
      setActiveTab(0);
      return;
    }
    if (!bloodGroup) {
      showToast({ severity: "error", message: "Blood group is required" });
      setActiveTab(0);
      return;
    }
    if (!postalCode.trim()) {
      showToast({ severity: "error", message: "Postal code is required" });
      setActiveTab(0);
      return;
    }
    if (!classId) {
      showToast({ severity: "error", message: "Class is required" });
      setActiveTab(1);
      return;
    }
    if (!sectionId) {
      showToast({ severity: "error", message: "Section is required" });
      setActiveTab(1);
      return;
    }
    if (!currentYear?.id) {
      showToast({ severity: "error", message: "Academic year not set" });
      return;
    }
    if (!rollNumber.trim()) {
      showToast({ severity: "error", message: "Roll number is required" });
      setActiveTab(1);
      return;
    }
    if (!fatherName.trim()) {
      showToast({ severity: "error", message: "Father's name is required" });
      setActiveTab(2);
      return;
    }
    if (!fatherPhone.trim()) {
      showToast({ severity: "error", message: "Father's phone number is required" });
      setActiveTab(2);
      return;
    }
    if (!fatherOccupation.trim()) {
      showToast({ severity: "error", message: "Father's occupation is required" });
      setActiveTab(2);
      return;
    }
    if (!fatherNID.trim()) {
      showToast({ severity: "error", message: "Father's NID number is required" });
      setActiveTab(2);
      return;
    }
    if (!motherName.trim()) {
      showToast({ severity: "error", message: "Mother's name is required" });
      setActiveTab(2);
      return;
    }
    if (!motherPhone.trim()) {
      showToast({ severity: "error", message: "Mother's phone number is required" });
      setActiveTab(2);
      return;
    }
    if (!motherOccupation.trim()) {
      showToast({ severity: "error", message: "Mother's occupation is required" });
      setActiveTab(2);
      return;
    }
    if (!motherNID.trim()) {
      showToast({ severity: "error", message: "Mother's NID number is required" });
      setActiveTab(2);
      return;
    }

	    setSaving(true);
	    try {
	      const silentSuccessToast = { suppressSuccessToast: true };
	      const student = await createStudent({
	        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        admission_no: admissionNo.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        nationality: nationality || null,
        religion: religion || null,
        blood_group: bloodGroup || null,
        admission_date: admissionDate || null,
        admission_status: "pending",
        medium: medium || null,
        shift: shift || null,
        previous_school_name: previousSchool.trim() || null,
        present_address: presentAddress.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        emergency_contact_name: emergencyContactName.trim() || null,
	        emergency_contact_phone: emergencyContactPhone.trim() || null,
	        status: "inactive",
	      }, silentSuccessToast);
	
	      if (studentPhoto) {
	        await uploadStudentPhoto(student.id, studentPhoto, silentSuccessToast);
	      }

      if (transferCertificate) {
	        await uploadStudentDocument(
	          student.id,
	          transferCertificate,
	          "transfer_certificate",
	          silentSuccessToast,
	        );
	      }

      if (birthCertificate) {
	        await uploadStudentDocument(
	          student.id,
	          birthCertificate,
	          "birth_certificate",
	          silentSuccessToast,
	        );
	      }

      if (fatherName.trim()) {
	        const father = await createGuardian({
	          full_name: fatherName.trim(),
	          phone: fatherPhone.trim() || null,
	          email: fatherEmail.trim() || null,
	          occupation: fatherOccupation.trim() || null,
	          id_number: fatherNID.trim() || null,
	        }, silentSuccessToast);
	
	        if (fatherPhoto) {
	          await uploadGuardianPhoto(father.id, fatherPhoto, silentSuccessToast);
	        }
	
	        await linkGuardianToStudent(student.id, {
	          guardian_id: father.id,
	          relation: "father",
	          is_primary: true,
	        }, silentSuccessToast);
	      }
	
	      if (motherName.trim()) {
	        const mother = await createGuardian({
	          full_name: motherName.trim(),
	          phone: motherPhone.trim() || null,
	          email: motherEmail.trim() || null,
	          occupation: motherOccupation.trim() || null,
	          id_number: motherNID.trim() || null,
	        }, silentSuccessToast);
	
	        if (motherPhoto) {
	          await uploadGuardianPhoto(mother.id, motherPhoto, silentSuccessToast);
	        }
	
	        await linkGuardianToStudent(student.id, {
	          guardian_id: mother.id,
	          relation: "mother",
	          is_primary: false,
	        }, silentSuccessToast);
	      }
	
	      await createEnrollment({
	        student_id: student.id,
	        academic_year_id: currentYear.id,
	        class_id: classId,
	        section_id: sectionId || null,
	        roll_number: rollNumber.trim() || null,
	      }, silentSuccessToast);
	
	      showToast({
	        severity: "success",
	        message: "Action completed successfully",
	        autoHideDuration: 3000,
	      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      showToast({ severity: "error", message: "Failed to create admission" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 4,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 48, height: 48 }}>
            <School />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              New Student Admission
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fill in the student information to create admission
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ "& .MuiTab-root": { minHeight: 64, fontSize: '1rem' } }}
        >
          <Tab
            label="Student Details"
            icon={<Person />}
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600, mr: 2 }}
          />
          <Tab
            label="Academic Info"
            icon={<School />}
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600, mr: 2 }}
          />
          <Tab
            label="Parent / Guardian"
            icon={<People />}
            iconPosition="start"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 4, bgcolor: "grey.50" }}>
        {activeTab === 0 && (
          <Grid container spacing={4}>
            {/* Left Column: Photo & Key ID */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    width: "100%",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    textAlign: "center",
                    mb: 3
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Student Photo
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: "none" }}
                    id="student-photo-upload"
                    type="file"
                    onChange={(e) => handlePhotoChange(e, "student")}
                  />
                  <label htmlFor="student-photo-upload">
                    <Avatar
                      src={studentPhotoPreview}
                      sx={{
                        width: 160,
                        height: 160,
                        mx: "auto",
                        mb: 2,
                        cursor: "pointer",
                        border: "4px solid",
                        borderColor: "primary.light",
                        transition: "all 0.3s ease",
                        "&:hover": { opacity: 0.8, transform: "scale(1.02)" },
                      }}
                    >
                      <PhotoCamera sx={{ fontSize: 48 }} />
                    </Avatar>
                  </label>
	                  <Typography variant="caption" color="text.secondary" display="block">
	                    Click to upload • Max 2MB
	                  </Typography>
	                  {studentPhoto && (
	                    <Link
	                      component="button"
	                      type="button"
	                      variant="body2"
	                      underline="hover"
	                      sx={{ mt: 1, display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere" }}
	                      onClick={() => openSelectedFile(studentPhoto)}
	                    >
	                      {studentPhoto.name}
	                    </Link>
	                  )}
	                </Paper>

                <Alert severity="info" sx={{ width: "100%", borderRadius: 2 }}>
                  Admission No will be auto-generated if left blank.
                </Alert>
              </Box>
            </Grid>

            {/* Right Column: Input Fields */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid container spacing={3}>
                {/* Personal Section */}
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={700}>
                      Personal Information
                    </Typography>
                  </Stack>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="First Name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={gender}
                      label="Gender"
                      onChange={(e) => setGender(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">Unspecified</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Date of Birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Nationality"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Blood Group</InputLabel>
                    <Select
                      value={bloodGroup}
                      label="Blood Group"
                      onChange={(e) => setBloodGroup(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="A+">A+</MenuItem>
                      <MenuItem value="A-">A-</MenuItem>
                      <MenuItem value="B+">B+</MenuItem>
                      <MenuItem value="B-">B-</MenuItem>
                      <MenuItem value="AB+">AB+</MenuItem>
                      <MenuItem value="AB-">AB-</MenuItem>
                      <MenuItem value="O+">O+</MenuItem>
                      <MenuItem value="O-">O-</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                {/* Address Section */}
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Home color="action" />
                    <Typography variant="h6" fontWeight={700}>
                      Address Details
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Present Address"
                    value={presentAddress}
                    onChange={(e) => setPresentAddress(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Postal Code"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>

                {/* Emergency Contact */}
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, mt: 1 }}>
                    <ContactPhone color="action" />
                    <Typography variant="h6" fontWeight={700}>
                      Emergency Contact
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Contact Name"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Phone Number"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    fullWidth
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
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
              <FormControl fullWidth required>
                <InputLabel>Class</InputLabel>
                <Select
                  value={classId}
                  label="Class"
                  onChange={(e) => setClassId(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {classes.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
	              <FormControl fullWidth required disabled={!classId}>
	                <InputLabel>Section</InputLabel>
	                <Select
	                  value={sectionId}
	                  label="Section"
	                  onChange={(e) => setSectionId(e.target.value)}
	                  sx={{ borderRadius: 2 }}
	                >
	                  {sectionsLoading ? (
	                    <MenuItem value="" disabled>
	                      Loading sections...
	                    </MenuItem>
	                  ) : sections.length === 0 ? (
	                    <MenuItem value="" disabled>
	                      No active sections found
	                    </MenuItem>
	                  ) : (
	                    sections.map((s) => (
	                      <MenuItem key={s.id} value={s.id}>
	                        {s.name}
	                      </MenuItem>
	                    ))
	                  )}
	                </Select>
	              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Admission Roll Number"
                value={rollNumber}
                onChange={(e) => {
                  rollNumberManualRef.current = true;
                  setRollNumber(e.target.value);
                }}
                fullWidth
                required
                inputProps={{ maxLength: 32 }}
                placeholder={
                  rollNumberLoading ? "Suggesting next roll..." : "Enter roll number"
                }
                helperText="You can type a custom roll number. A suggestion is filled only if this field is left unchanged."
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Admission Date"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Admission Number (Optional)"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                fullWidth
                placeholder="Leave blank to auto-generate"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Medium</InputLabel>
                <Select
                  value={medium}
                  label="Medium"
                  onChange={(e) => setMedium(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="English">English</MenuItem>
                  <MenuItem value="Bengali">Bengali</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Shift</InputLabel>
                <Select
                  value={shift}
                  label="Shift"
                  onChange={(e) => setShift(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="Morning">Morning</MenuItem>
                  <MenuItem value="Day">Day</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Extra Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Previous School Name"
                value={previousSchool}
                onChange={(e) => setPreviousSchool(e.target.value)}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 2,
                  borderStyle: "dashed",
                  textAlign: "center",
                  bgcolor: "grey.50"
                }}
              >
                <Button
                  component="label"
                  startIcon={<Description />}
                  sx={{ mb: 1 }}
                >
                  Upload Transfer Certificate
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setTransferCertificate(e.target.files?.[0] || null)}
                  />
                </Button>
	                {transferCertificate ? (
	                  <Typography variant="body2" color="success.main" fontWeight={500}>
	                    File selected:{" "}
	                    <Link
	                      component="button"
	                      type="button"
	                      color="success.main"
	                      underline="hover"
	                      fontWeight={500}
	                      sx={{ maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center" }}
	                      onClick={() => openSelectedFile(transferCertificate)}
	                    >
	                      {transferCertificate.name}
	                    </Link>
	                  </Typography>
	                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Supported formats: PDF, JPG, PNG
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 2,
                  borderStyle: "dashed",
                  textAlign: "center",
                  bgcolor: "grey.50"
                }}
              >
                <Button
                  component="label"
                  startIcon={<Description />}
                  sx={{ mb: 1 }}
                >
                  Upload Birth Certificate
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setBirthCertificate(e.target.files?.[0] || null)}
                  />
                </Button>
	                {birthCertificate ? (
	                  <Typography variant="body2" color="success.main" fontWeight={500}>
	                    File selected:{" "}
	                    <Link
	                      component="button"
	                      type="button"
	                      color="success.main"
	                      underline="hover"
	                      fontWeight={500}
	                      sx={{ maxWidth: "100%", overflowWrap: "anywhere", textAlign: "center" }}
	                      onClick={() => openSelectedFile(birthCertificate)}
	                    >
	                      {birthCertificate.name}
	                    </Link>
	                  </Typography>
	                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Optional • Supported formats: PDF, JPG, PNG
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}

        {activeTab === 2 && (
          <Grid container spacing={4}>
            {/* Father Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar sx={{ bgcolor: "info.main" }}>F</Avatar>
                  <Typography variant="h6" fontWeight={700}>Father's Info</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Full Name"
                      required
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Phone Number"
                      required
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Email"
                      value={fatherEmail}
                      onChange={(e) => setFatherEmail(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Occupation"
                      required
                      value={fatherOccupation}
                      onChange={(e) => setFatherOccupation(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="NID Number"
                      required
                      value={fatherNID}
                      onChange={(e) => setFatherNID(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      size="small"
                      sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                    >
                      {fatherPhoto ? "Photo Selected" : "Upload Photo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, "father")}
	                      />
	                    </Button>
	                    {fatherPhoto && (
	                      <Link
	                        component="button"
	                        type="button"
	                        variant="body2"
	                        underline="hover"
	                        sx={{ mt: 1, display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere" }}
	                        onClick={() => openSelectedFile(fatherPhoto)}
	                      >
	                        {fatherPhoto.name}
	                      </Link>
	                    )}
	                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Mother Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Avatar sx={{ bgcolor: "secondary.main" }}>M</Avatar>
                  <Typography variant="h6" fontWeight={700}>Mother's Info</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Full Name"
                      required
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Phone Number"
                      required
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Email"
                      value={motherEmail}
                      onChange={(e) => setMotherEmail(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Occupation"
                      required
                      value={motherOccupation}
                      onChange={(e) => setMotherOccupation(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="NID Number"
                      required
                      value={motherNID}
                      onChange={(e) => setMotherNID(e.target.value)}
                      fullWidth
                      size="small"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<PhotoCamera />}
                      size="small"
                      sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                    >
                      {motherPhoto ? "Photo Selected" : "Upload Photo"}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, "mother")}
	                      />
	                    </Button>
	                    {motherPhoto && (
	                      <Link
	                        component="button"
	                        type="button"
	                        variant="body2"
	                        underline="hover"
	                        sx={{ mt: 1, display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere" }}
	                        onClick={() => openSelectedFile(motherPhoto)}
	                      >
	                        {motherPhoto.name}
	                      </Link>
	                    )}
	                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, bgcolor: "grey.50" }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, px: 3 }}>
          Cancel
        </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving}
          startIcon={<CheckCircle />}
          sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 700 }}
        >
          {saving ? "Creating Admission..." : "Create Admission"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
