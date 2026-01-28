import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Dialog,
  DialogContent,
  IconButton,
  Chip,
  Avatar,
  Card,
  CardContent,
  Alert,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  People,
  CheckCircle,
  BeachAccess,
  Cake,
  CloudUpload,
  Close,
  ArrowBack,
  ArrowForward,
  Save,
  Person,
  Work,
  ContactPhone,
  School,
  AccountBalance,
  AttachMoney,
} from "@mui/icons-material";
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  listDepartments,
  listDesignations,
  listStaffContracts,
  createStaffContract,
  updateStaffContract,
  type Staff,
  type Department,
  type Designation,
  type StaffContract,
} from "../../../../api/staffManagement";

// Extended staff form data
interface StaffFormData {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  marital_status?: string;
  nationality?: string;
  religion?: string;
  present_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  department_id?: string;
  designation_id?: string;
  date_of_joining?: string;
  employment_type?: string;
  status?: string;
  highest_qualification?: string;
  specialization?: string;
  experience_years?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  profile_photo_url?: string;

  // Salary (Contract)
  contract_id?: string;
  salary_amount?: number;
  contract_type?: string;
  allowances_list?: { label: string; amount: number }[];
  deductions_list?: { label: string; amount: number }[];
}

const defaultFormData: StaffFormData = {
  employee_id: "",
  first_name: "",
  last_name: "",
  email: "",
  status: "active",
  employment_type: "full_time",
  nationality: "Bangladeshi",
  country: "Bangladesh",
  contract_type: "permanent",
  salary_amount: 0,
  allowances_list: [],
  deductions_list: [],
};

const steps = [
  { label: "Basic Info", iconName: "Person" },
  { label: "Employment", iconName: "Work" },
  { label: "Salary", iconName: "AttachMoney" },
  { label: "Contact", iconName: "ContactPhone" },
  { label: "Education", iconName: "School" },
  { label: "Bank", iconName: "AccountBalance" },
];

// Form field component for consistency
const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <Box sx={{ mb: 2.5 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ mb: 0.5, display: "block", fontWeight: 500 }}
    >
      {label} {required && <span style={{ color: "#d32f2f" }}>*</span>}
    </Typography>
    {children}
  </Box>
);

export default function DirectoryTab() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(defaultFormData);
  const [staffContracts, setStaffContracts] = useState<StaffContract[]>([]);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    onLeave: 0,
    birthdays: 0,
  });

  const getStepIcon = (iconName: string) => {
    switch (iconName) {
      case "Person":
        return <Person />;
      case "Work":
        return <Work />;
      case "AttachMoney":
        return <AttachMoney />;
      case "ContactPhone":
        return <ContactPhone />;
      case "School":
        return <School />;
      case "AccountBalance":
        return <AccountBalance />;
      default:
        return null;
    }
  };

  useEffect(() => {
    loadDepartments();
    loadDesignations();
  }, []);

  useEffect(() => {
    loadStaff();
  }, [
    page,
    rowsPerPage,
    searchQuery,
    departmentFilter,
    designationFilter,
    statusFilter,
  ]);

  const loadDepartments = async () => {
    try {
      const result = await listDepartments({ limit: 100 });
      if (result.ok && result.data) {
        setDepartments((result.data as any).items || []);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  };

  const loadDesignations = async () => {
    try {
      const result = await listDesignations({ limit: 100 });
      if (result.ok && result.data) {
        setDesignations((result.data as any).items || []);
      }
    } catch (error) {
      console.error("Failed to load designations:", error);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    const result = await listStaff({
      page: page + 1,
      limit: rowsPerPage,
      search: searchQuery || undefined,
      department: departmentFilter || undefined,
      designation: designationFilter || undefined,
      status: statusFilter || undefined,
    });

    if (result.ok && result.data) {
      const data = result.data as any;
      setStaff(data.items || []);
      setTotal(data.total || 0);
      const allStaff = data.items || [];
      setStats({
        total: data.total || 0,
        active: allStaff.filter((s: Staff) => s.status === "active").length,
        onLeave: 0,
        birthdays: 0,
      });
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setFormData(defaultFormData);
    setError("");
    setActiveStep(0);
    setPreviewPhoto(null);
    setDialogOpen(true);
  };

  const handleEdit = async (staffMember: Staff) => {
    setEditingStaff(staffMember);

    // Default contract values
    let contractData: Partial<StaffFormData> = {
      contract_id: undefined,
      contract_type: "permanent",
      salary_amount: 0,
      allowances_list: [],
      deductions_list: [],
    };

    // Fetch existing contract
    try {
      const contractsResponse = await listStaffContracts(staffMember.id);
      if (contractsResponse.ok && contractsResponse.data) {
        setStaffContracts(contractsResponse.data);
        if (contractsResponse.data.length > 0) {
          // Use the most recent contract
          const contract = contractsResponse.data[0];
          contractData = {
            contract_id: contract.id,
            contract_type: contract.contract_type,
            salary_amount: contract.salary,
            allowances_list: Object.entries(contract.allowances || {}).map(
              ([label, amount]) => ({
                label,
                amount: Number(amount),
              }),
            ),
            deductions_list: Object.entries(contract.deductions || {}).map(
              ([label, amount]) => ({
                label,
                amount: Number(amount),
              }),
            ),
          };
        }
      } else {
        setStaffContracts([]);
      }
    } catch (error) {
      console.error("Failed to fetch contracts", error);
      setStaffContracts([]);
    }

    setFormData({
      employee_id: staffMember.employee_id,
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      email: staffMember.email,
      phone: staffMember.phone,
      department_id: staffMember.department_id,
      designation_id: staffMember.designation_id,
      date_of_joining: staffMember.date_of_joining,
      status: staffMember.status,

      // Personal
      gender: staffMember.gender,
      date_of_birth: staffMember.date_of_birth,
      blood_group: staffMember.blood_group,
      nationality: staffMember.nationality,
      marital_status: staffMember.marital_status,
      religion: staffMember.religion,

      // Address
      present_address: staffMember.present_address || staffMember.address,
      permanent_address: staffMember.permanent_address,
      city: staffMember.city,
      state: staffMember.state,
      postal_code: staffMember.postal_code,
      country: staffMember.country,

      // Emergency
      emergency_contact_name: staffMember.emergency_contact_name,
      emergency_contact_phone: staffMember.emergency_contact_phone,
      emergency_contact_relation: staffMember.emergency_contact_relation,

      // Employment
      employment_type: staffMember.employment_type,

      // Qualifications
      highest_qualification: staffMember.highest_qualification,
      specialization: staffMember.specialization,
      experience_years: staffMember.experience_years,

      // Bank
      bank_name: staffMember.bank_name,
      bank_account_number: staffMember.bank_account_number,
      bank_ifsc: staffMember.bank_ifsc,

      profile_photo_url: staffMember.profile_photo_url,

      // Contract Data
      ...contractData,
    });
    setPreviewPhoto(staffMember.profile_photo_url || null);
    setError("");
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    if (
      !formData.employee_id ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.email
    ) {
      setError("Employee ID, First Name, Last Name, and Email are required");
      return;
    }

    const apiData: any = {
      ...formData,
      // Ensure specific fields are undefined if empty strings to match backend optionality
      department_id: formData.department_id || undefined,
      designation_id: formData.designation_id || undefined,
      date_of_joining: formData.date_of_joining || undefined,
      phone: formData.phone || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      experience_years: formData.experience_years || undefined,
    };

    const result = editingStaff
      ? await updateStaff(editingStaff.id, apiData)
      : await createStaff(apiData);

    if (result.ok) {
      // Handle Contract Save
      const staffId = result.data.id;

      const allowances =
        formData.allowances_list?.reduce(
          (acc, curr) => {
            if (curr.label) acc[curr.label] = Number(curr.amount);
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const deductions =
        formData.deductions_list?.reduce(
          (acc, curr) => {
            if (curr.label) acc[curr.label] = Number(curr.amount);
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const contractPayload = {
        contract_type: formData.contract_type || "permanent",
        start_date:
          formData.date_of_joining || new Date().toISOString().split("T")[0],
        salary: Number(formData.salary_amount) || 0,
        salary_currency: "BDT",
        allowances,
        deductions,
        working_hours_per_week: 40,
        status: "active",
      };

      try {
        if (formData.contract_id) {
          await updateStaffContract(
            staffId,
            formData.contract_id,
            contractPayload,
          );
        } else {
          await createStaffContract(staffId, contractPayload);
        }
      } catch (err) {
        console.error("Failed to save contract", err);
        // We don't block the staff save if contract save fails, but maybe we should show a warning?
        // For now, we proceed.
      }

      setDialogOpen(false);
      loadStaff();
    } else {
      setError("Failed to save staff member");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    const result = await deleteStaff(id);
    if (result.ok) loadStaff();
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
        setFormData({
          ...formData,
          profile_photo_url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const getDepartmentName = (id?: string) =>
    departments.find((d) => d.id === id)?.name || "-";
  const getDesignationName = (id?: string) =>
    designations.find((d) => d.id === id)?.title || "-";

  const updateField = useCallback((field: keyof StaffFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Box>
      {/* Stats Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            icon: <People />,
            value: stats.total,
            label: "Total Staff",
            color: "#1976d2",
          },
          {
            icon: <CheckCircle />,
            value: stats.active,
            label: "Active",
            color: "#2e7d32",
          },
          {
            icon: <BeachAccess />,
            value: stats.onLeave,
            label: "On Leave",
            color: "#ed6c02",
          },
          {
            icon: <Cake />,
            value: stats.birthdays,
            label: "Birthdays",
            color: "#0288d1",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            sx={{
              background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}08 100%)`,
              border: `1px solid ${stat.color}30`,
            }}
          >
            <CardContent
              sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}
            >
              <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={600}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          select
          label="Department"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Designation"
          value={designationFilter}
          onChange={(e) => setDesignationFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {designations.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="on_leave">On Leave</MenuItem>
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          }}
        >
          Add Staff
        </Button>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f5f7fa" }}>
              {[
                "Staff",
                "Employee ID",
                "Department",
                "Designation",
                "Contact",
                "Status",
                "Actions",
              ].map((h, i) => (
                <TableCell
                  key={i}
                  sx={{ fontWeight: 600, color: "#374151" }}
                  align={i === 6 ? "right" : "left"}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              staff.map((m) => (
                <TableRow
                  key={m.id}
                  hover
                  sx={{ "&:hover": { bgcolor: "#f8fafc" } }}
                >
                  <TableCell>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Avatar
                        src={m.profile_photo_url}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: "#e3f2fd",
                          color: "#1976d2",
                          fontWeight: 600,
                        }}
                      >
                        {m.first_name?.[0]}
                        {m.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {m.first_name} {m.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.employee_id || "-"}
                      size="small"
                      sx={{ bgcolor: "#e8f5e9", color: "#2e7d32" }}
                    />
                  </TableCell>
                  <TableCell>{getDepartmentName(m.department_id)}</TableCell>
                  <TableCell>{getDesignationName(m.designation_id)}</TableCell>
                  <TableCell>{m.phone || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={m.status || "unknown"}
                      size="small"
                      color={
                        m.status === "active"
                          ? "success"
                          : m.status === "on_leave"
                            ? "warning"
                            : "default"
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(m)}
                      sx={{ color: "#1976d2" }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(m.id)}
                      sx={{ color: "#d32f2f" }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
        />
      </TableContainer>

      {/* Professional Staff Form Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0, display: "flex", minHeight: 600 }}>
          {/* Left Panel - Photo & Summary (Golden Ratio: 38.2%) */}
          <Box
            sx={{
              width: "38.2%",
              background: "linear-gradient(180deg, #1976d2 0%, #0d47a1 100%)",
              color: "white",
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <IconButton
              onClick={() => setDialogOpen(false)}
              sx={{ position: "absolute", top: 8, left: 8, color: "white" }}
            >
              <Close />
            </IconButton>

            <Typography variant="h5" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
              {editingStaff ? "Edit Staff" : "New Staff"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.8, mb: 4, textAlign: "center" }}
            >
              {editingStaff
                ? "Update employee information"
                : "Create a new employee profile"}
            </Typography>

            {/* Profile Photo */}
            <Box sx={{ position: "relative", mb: 3 }}>
              <Avatar
                src={previewPhoto || undefined}
                sx={{
                  width: 140,
                  height: 140,
                  border: "4px solid rgba(255,255,255,0.3)",
                  bgcolor: "rgba(255,255,255,0.2)",
                  fontSize: 48,
                }}
              >
                {formData.first_name?.[0] || "?"}
                {formData.last_name?.[0] || ""}
              </Avatar>
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  bgcolor: "white",
                  color: "#1976d2",
                  "&:hover": { bgcolor: "#f5f5f5" },
                  boxShadow: 2,
                }}
              >
                <CloudUpload fontSize="small" />
              </IconButton>
            </Box>

            {/* Preview Name */}
            <Typography variant="h6" fontWeight={500} sx={{ mb: 0.5 }}>
              {formData.first_name || "First"} {formData.last_name || "Last"}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 4 }}>
              {formData.employee_id || "Employee ID"}
            </Typography>

            {/* Step Indicators */}
            <Box sx={{ width: "100%", mt: "auto" }}>
              {steps.map((step, i) => (
                <Box
                  key={i}
                  onClick={() => setActiveStep(i)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    bgcolor:
                      activeStep === i
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    transition: "all 0.2s",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor:
                        activeStep === i ? "white" : "rgba(255,255,255,0.2)",
                      color: activeStep === i ? "#1976d2" : "white",
                      fontSize: 14,
                    }}
                  >
                    {getStepIcon(step.iconName)}
                  </Avatar>
                  <Typography
                    variant="body2"
                    fontWeight={activeStep === i ? 600 : 400}
                  >
                    {step.label}
                  </Typography>
                </Box>
              ))}

              {/* Sidebar Submit Button */}
              <Box
                sx={{
                  mt: 4,
                  pt: 4,
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSave}
                  startIcon={<Save />}
                  sx={{
                    bgcolor: "white",
                    color: "#1976d2",
                    fontWeight: 600,
                    py: 1.5,
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.9)",
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.2s",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {editingStaff ? "Update Staff" : "Create Staff"}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Right Panel - Form (Golden Ratio: 61.8%) */}
          <Box
            sx={{
              width: "61.8%",
              p: 4,
              bgcolor: "#fafbfc",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ mb: 3, color: "#1976d2" }}
            >
              {steps[activeStep].label}
            </Typography>

            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {/* Step 0: Basic Info */}
              {activeStep === 0 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 3,
                  }}
                >
                  <FormField label="Employee ID" required>
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.employee_id}
                      onChange={(e) =>
                        updateField("employee_id", e.target.value)
                      }
                      placeholder="e.g., EMP001"
                    />
                  </FormField>
                  <FormField label="Email Address" required>
                    <TextField
                      fullWidth
                      size="small"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="email@school.com"
                    />
                  </FormField>
                  <FormField label="First Name" required>
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.first_name}
                      onChange={(e) =>
                        updateField("first_name", e.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Last Name" required>
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.last_name}
                      onChange={(e) => updateField("last_name", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Phone Number">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </FormField>
                  <FormField label="Gender">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.gender || ""}
                      onChange={(e) => updateField("gender", e.target.value)}
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </FormField>
                  <FormField label="Date of Birth">
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={formData.date_of_birth || ""}
                      onChange={(e) =>
                        updateField("date_of_birth", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </FormField>
                  <FormField label="Blood Group">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.blood_group || ""}
                      onChange={(e) =>
                        updateField("blood_group", e.target.value)
                      }
                    >
                      <MenuItem value="">Select</MenuItem>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (g) => (
                          <MenuItem key={g} value={g}>
                            {g}
                          </MenuItem>
                        ),
                      )}
                    </TextField>
                  </FormField>
                  <FormField label="Marital Status">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.marital_status || ""}
                      onChange={(e) =>
                        updateField("marital_status", e.target.value)
                      }
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="single">Single</MenuItem>
                      <MenuItem value="married">Married</MenuItem>
                      <MenuItem value="divorced">Divorced</MenuItem>
                    </TextField>
                  </FormField>
                  <FormField label="Nationality">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.nationality || ""}
                      onChange={(e) =>
                        updateField("nationality", e.target.value)
                      }
                    />
                  </FormField>
                </Box>
              )}

              {/* Step 1: Employment */}
              {activeStep === 1 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 3,
                  }}
                >
                  <FormField label="Department">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.department_id || ""}
                      onChange={(e) =>
                        updateField("department_id", e.target.value)
                      }
                    >
                      <MenuItem value="">Select Department</MenuItem>
                      {departments.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormField>
                  <FormField label="Designation">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.designation_id || ""}
                      onChange={(e) =>
                        updateField("designation_id", e.target.value)
                      }
                    >
                      <MenuItem value="">Select Designation</MenuItem>
                      {designations.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.title}
                        </MenuItem>
                      ))}
                    </TextField>
                  </FormField>
                  <FormField label="Date of Joining">
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      value={formData.date_of_joining || ""}
                      onChange={(e) =>
                        updateField("date_of_joining", e.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                  </FormField>
                  <FormField label="Employment Type">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.employment_type || "full_time"}
                      onChange={(e) =>
                        updateField("employment_type", e.target.value)
                      }
                    >
                      <MenuItem value="full_time">Full Time</MenuItem>
                      <MenuItem value="part_time">Part Time</MenuItem>
                      <MenuItem value="contract">Contract</MenuItem>
                      <MenuItem value="intern">Intern</MenuItem>
                    </TextField>
                  </FormField>
                  <FormField label="Status">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.status || "active"}
                      onChange={(e) => updateField("status", e.target.value)}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="on_leave">On Leave</MenuItem>
                      <MenuItem value="terminated">Terminated</MenuItem>
                    </TextField>
                  </FormField>
                </Box>
              )}

              {/* Step 2: Salary */}
              {activeStep === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 3,
                    }}
                  >
                    <FormField label="Contract Type">
                      <TextField
                        fullWidth
                        size="small"
                        select
                        value={formData.contract_type || "permanent"}
                        onChange={(e) =>
                          updateField("contract_type", e.target.value)
                        }
                      >
                        <MenuItem value="permanent">Permanent</MenuItem>
                        <MenuItem value="probation">Probation</MenuItem>
                        <MenuItem value="contract">Contractual</MenuItem>
                      </TextField>
                    </FormField>
                    <FormField label="Basic Salary (Monthly)">
                      {(() => {
                        const desig = designations.find(
                          (d) => d.id === formData.designation_id,
                        );
                        const min = desig?.min_salary;
                        const max = desig?.max_salary;
                        const hasMin = min !== undefined && min !== null;
                        const hasMax = max !== undefined && max !== null;
                        const val = formData.salary_amount || 0;
                        const isError =
                          (hasMin && val < min) || (hasMax && val > max);

                        return (
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={formData.salary_amount || ""}
                            onChange={(e) =>
                              updateField(
                                "salary_amount",
                                Number(e.target.value),
                              )
                            }
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  ৳
                                </InputAdornment>
                              ),
                            }}
                            error={!!(val && isError)}
                            helperText={
                              !desig
                                ? "Select a designation to see salary range"
                                : !hasMin && !hasMax
                                  ? null
                                  : val && isError
                                    ? `Salary must be between ৳${min || 0} and ৳${
                                        max || "Unlimited"
                                      }`
                                    : `Range: ৳${min || 0} - ৳${
                                        max || "Unlimited"
                                      }`
                            }
                          />
                        );
                      })()}
                    </FormField>
                  </Box>

                  {/* Allowances */}
                  <Box
                    sx={{
                      bgcolor: "white",
                      p: 2,
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        Allowances
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() =>
                          updateField("allowances_list", [
                            ...(formData.allowances_list || []),
                            { label: "", amount: 0 },
                          ])
                        }
                      >
                        Add Item
                      </Button>
                    </Box>
                    {formData.allowances_list?.map((item, index) => (
                      <Box key={index} sx={{ display: "flex", gap: 2, mb: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Label (e.g., House Rent)"
                          value={item.label}
                          onChange={(e) => {
                            const newList = [
                              ...(formData.allowances_list || []),
                            ];
                            newList[index].label = e.target.value;
                            updateField("allowances_list", newList);
                          }}
                          sx={{ flex: 2 }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => {
                            const newList = [
                              ...(formData.allowances_list || []),
                            ];
                            newList[index].amount = Number(e.target.value);
                            updateField("allowances_list", newList);
                          }}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newList = [
                              ...(formData.allowances_list || []),
                            ];
                            newList.splice(index, 1);
                            updateField("allowances_list", newList);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!formData.allowances_list ||
                      formData.allowances_list.length === 0) && (
                      <Typography variant="caption" color="text.secondary">
                        No allowances added.
                      </Typography>
                    )}
                  </Box>

                  {/* Deductions */}
                  <Box
                    sx={{
                      bgcolor: "white",
                      p: 2,
                      borderRadius: 1,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        Deductions
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() =>
                          updateField("deductions_list", [
                            ...(formData.deductions_list || []),
                            { label: "", amount: 0 },
                          ])
                        }
                      >
                        Add Item
                      </Button>
                    </Box>
                    {formData.deductions_list?.map((item, index) => (
                      <Box key={index} sx={{ display: "flex", gap: 2, mb: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Label (e.g., Tax)"
                          value={item.label}
                          onChange={(e) => {
                            const newList = [
                              ...(formData.deductions_list || []),
                            ];
                            newList[index].label = e.target.value;
                            updateField("deductions_list", newList);
                          }}
                          sx={{ flex: 2 }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => {
                            const newList = [
                              ...(formData.deductions_list || []),
                            ];
                            newList[index].amount = Number(e.target.value);
                            updateField("deductions_list", newList);
                          }}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            const newList = [
                              ...(formData.deductions_list || []),
                            ];
                            newList.splice(index, 1);
                            updateField("deductions_list", newList);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                    {(!formData.deductions_list ||
                      formData.deductions_list.length === 0) && (
                      <Typography variant="caption" color="text.secondary">
                        No deductions added.
                      </Typography>
                    )}
                  </Box>

                  {/* Summary */}
                  <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      gutterBottom
                    >
                      Estimated Salary
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2">Basic:</Typography>
                      <Typography variant="body2">
                        ৳{formData.salary_amount || 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="success.main">
                        Total Allowances:
                      </Typography>
                      <Typography variant="body2" color="success.main">
                        + ৳
                        {formData.allowances_list?.reduce(
                          (acc, curr) => acc + (Number(curr.amount) || 0),
                          0,
                        ) || 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="error.main">
                        Total Deductions:
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        - ৳
                        {formData.deductions_list?.reduce(
                          (acc, curr) => acc + (Number(curr.amount) || 0),
                          0,
                        ) || 0}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="subtitle2" fontWeight={600}>
                        Net Salary:
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={600}>
                        ৳
                        {(formData.salary_amount || 0) +
                          (formData.allowances_list?.reduce(
                            (acc, curr) => acc + (Number(curr.amount) || 0),
                            0,
                          ) || 0) -
                          (formData.deductions_list?.reduce(
                            (acc, curr) => acc + (Number(curr.amount) || 0),
                            0,
                          ) || 0)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Contract History */}
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      gutterBottom
                    >
                      Contract History
                    </Typography>
                    {staffContracts.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No previous contracts found.
                      </Typography>
                    ) : (
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ maxHeight: 200 }}
                      >
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Start Date</TableCell>
                              <TableCell>End Date</TableCell>
                              <TableCell align="right">Salary</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {staffContracts.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>
                                  {c.contract_type.charAt(0).toUpperCase() +
                                    c.contract_type.slice(1)}
                                </TableCell>
                                <TableCell>
                                  {new Date(c.start_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {c.end_date
                                    ? new Date(c.end_date).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell align="right">৳{c.salary}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={c.status}
                                    size="small"
                                    color={
                                      c.status === "active"
                                        ? "success"
                                        : "default"
                                    }
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Box>
              )}

              {/* Step 3: Contact */}
              {activeStep === 3 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 3,
                  }}
                >
                  <Box sx={{ gridColumn: "1 / -1" }}>
                    <FormField label="Present Address">
                      <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        value={formData.present_address || ""}
                        onChange={(e) =>
                          updateField("present_address", e.target.value)
                        }
                      />
                    </FormField>
                  </Box>
                  <FormField label="City">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.city || ""}
                      onChange={(e) => updateField("city", e.target.value)}
                    />
                  </FormField>
                  <FormField label="State / Division">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.state || ""}
                      onChange={(e) => updateField("state", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Postal Code">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.postal_code || ""}
                      onChange={(e) =>
                        updateField("postal_code", e.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Country">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.country || "Bangladesh"}
                      onChange={(e) => updateField("country", e.target.value)}
                    />
                  </FormField>
                  <Box sx={{ gridColumn: "1 / -1", mt: 2 }}>
                    <Typography
                      variant="subtitle2"
                      color="primary"
                      sx={{ mb: 2, fontWeight: 600 }}
                    >
                      Emergency Contact
                    </Typography>
                  </Box>
                  <FormField label="Contact Name">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.emergency_contact_name || ""}
                      onChange={(e) =>
                        updateField("emergency_contact_name", e.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Contact Phone">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.emergency_contact_phone || ""}
                      onChange={(e) =>
                        updateField("emergency_contact_phone", e.target.value)
                      }
                    />
                  </FormField>
                  <FormField label="Relationship">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.emergency_contact_relation || ""}
                      onChange={(e) =>
                        updateField(
                          "emergency_contact_relation",
                          e.target.value,
                        )
                      }
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="spouse">Spouse</MenuItem>
                      <MenuItem value="parent">Parent</MenuItem>
                      <MenuItem value="sibling">Sibling</MenuItem>
                      <MenuItem value="friend">Friend</MenuItem>
                    </TextField>
                  </FormField>
                </Box>
              )}

              {/* Step 4: Education */}
              {activeStep === 4 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 3,
                  }}
                >
                  <FormField label="Highest Qualification">
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={formData.highest_qualification || ""}
                      onChange={(e) =>
                        updateField("highest_qualification", e.target.value)
                      }
                    >
                      <MenuItem value="">Select</MenuItem>
                      <MenuItem value="phd">PhD / Doctorate</MenuItem>
                      <MenuItem value="masters">Master's Degree</MenuItem>
                      <MenuItem value="bachelors">Bachelor's Degree</MenuItem>
                      <MenuItem value="diploma">Diploma</MenuItem>
                      <MenuItem value="hsc">HSC / A-Level</MenuItem>
                    </TextField>
                  </FormField>
                  <FormField label="Specialization">
                    <TextField
                      fullWidth
                      size="small"
                      value={formData.specialization || ""}
                      onChange={(e) =>
                        updateField("specialization", e.target.value)
                      }
                      placeholder="e.g., Computer Science"
                    />
                  </FormField>
                  <FormField label="Years of Experience">
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={formData.experience_years || ""}
                      onChange={(e) =>
                        updateField(
                          "experience_years",
                          parseInt(e.target.value) || undefined,
                        )
                      }
                      inputProps={{ min: 0, max: 50 }}
                    />
                  </FormField>
                </Box>
              )}

              {/* Step 5: Bank */}
              {activeStep === 5 && (
                <Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 3,
                    }}
                  >
                    <FormField label="Bank Name">
                      <TextField
                        fullWidth
                        size="small"
                        value={formData.bank_name || ""}
                        onChange={(e) =>
                          updateField("bank_name", e.target.value)
                        }
                        placeholder="e.g., Dutch Bangla Bank"
                      />
                    </FormField>
                    <FormField label="Account Number">
                      <TextField
                        fullWidth
                        size="small"
                        value={formData.bank_account_number || ""}
                        onChange={(e) =>
                          updateField("bank_account_number", e.target.value)
                        }
                      />
                    </FormField>
                    <FormField label="Branch / Routing Number">
                      <TextField
                        fullWidth
                        size="small"
                        value={formData.bank_ifsc || ""}
                        onChange={(e) =>
                          updateField("bank_ifsc", e.target.value)
                        }
                      />
                    </FormField>
                    <Box sx={{ gridColumn: "1 / -1" }}>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Bank details are securely stored for payroll processing.
                      </Alert>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Navigation Buttons (Footer) */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 3,
                pt: 3,
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <Button
                startIcon={<ArrowBack />}
                onClick={() => setActiveStep((s) => s - 1)}
                disabled={activeStep === 0}
                sx={{ visibility: activeStep === 0 ? "hidden" : "visible" }}
              >
                Previous
              </Button>
              <Box sx={{ display: "flex", gap: 2 }}>
                {activeStep < steps.length - 1 && (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={() => setActiveStep((s) => s + 1)}
                  >
                    Next
                  </Button>
                )}
                {/* Submit button is now inside the Bank tab (last step) */}
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
