import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Business,
  Work,
  BeachAccess,
} from "@mui/icons-material";
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  listDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
  listLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  type Department,
  type DepartmentCreate,
  type Designation,
  type DesignationCreate,
  type LeaveType,
  type LeaveTypeCreate,
} from "../../../../api/staffManagement";

type SettingsSection = "departments" | "designations" | "leave-types";

export default function SettingsTab() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("departments");

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeSection}
          onChange={(_, value) => setActiveSection(value)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<Business />}
            iconPosition="start"
            label="Departments"
            value="departments"
          />
          <Tab
            icon={<Work />}
            iconPosition="start"
            label="Designations"
            value="designations"
          />
          <Tab
            icon={<BeachAccess />}
            iconPosition="start"
            label="Leave Types"
            value="leave-types"
          />
        </Tabs>
      </Paper>

      {activeSection === "departments" && <DepartmentsSection />}
      {activeSection === "designations" && <DesignationsSection />}
      {activeSection === "leave-types" && <LeaveTypesSection />}
    </Box>
  );
}

// ============================================================================
// DEPARTMENTS SECTION
// ============================================================================

function DepartmentsSection() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<DepartmentCreate>({
    name: "",
    code: "",
    is_active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    const result = await listDepartments({ limit: 100 });
    if (result.ok && result.data) {
      setDepartments((result.data as any).items || []);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingDept(null);
    setFormData({ name: "", code: "", is_active: true });
    setError("");
    setDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description,
      budget_allocated: dept.budget_allocated,
      is_active: dept.is_active,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    
    if (!formData.name || !formData.code) {
      setError("Name and Code are required");
      return;
    }

    const result = editingDept
      ? await updateDepartment(editingDept.id, formData)
      : await createDepartment(formData);

    if (result.ok) {
      setDialogOpen(false);
      loadDepartments();
    } else {
      setError("Failed to save department");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    const result = await deleteDepartment(id);
    if (result.ok) {
      loadDepartments();
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Departments</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Department
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Budget</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Loading...</TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No departments found</TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>
                    <Chip label={dept.code} size="small" />
                  </TableCell>
                  <TableCell>
                    {dept.budget_allocated
                      ? `৳${dept.budget_allocated.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={dept.is_active ? "Active" : "Inactive"}
                      color={dept.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(dept)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(dept.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDept ? "Edit Department" : "Add Department"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            helperText="Unique code (e.g., MATH, ADMIN)"
          />
          
          <TextField
            label="Budget Allocated"
            fullWidth
            margin="normal"
            type="number"
            value={formData.budget_allocated || ""}
            onChange={(e) => setFormData({ ...formData, budget_allocated: parseFloat(e.target.value) || undefined })}
          />
          
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingDept ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// DESIGNATIONS SECTION
// ============================================================================

function DesignationsSection() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [formData, setFormData] = useState<DesignationCreate>({
    title: "",
    code: "",
    level: 5,
    is_active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    setLoading(true);
    const result = await listDesignations({ limit: 100 });
    if (result.ok && result.data) {
      setDesignations((result.data as any).items || []);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingDesig(null);
    setFormData({ title: "", code: "", level: 5, is_active: true });
    setError("");
    setDialogOpen(true);
  };

  const handleEdit = (desig: Designation) => {
    setEditingDesig(desig);
    setFormData({
      title: desig.title,
      code: desig.code,
      level: desig.level,
      description: desig.description,
      min_salary: desig.min_salary,
      max_salary: desig.max_salary,
      is_active: desig.is_active,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    
    if (!formData.title || !formData.code) {
      setError("Title and Code are required");
      return;
    }

    const result = editingDesig
      ? await updateDesignation(editingDesig.id, formData)
      : await createDesignation(formData);

    if (result.ok) {
      setDialogOpen(false);
      loadDesignations();
    } else {
      setError("Failed to save designation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this designation?")) return;
    
    const result = await deleteDesignation(id);
    if (result.ok) {
      loadDesignations();
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Designations</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Designation
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Salary Range</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Loading...</TableCell>
              </TableRow>
            ) : designations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No designations found</TableCell>
              </TableRow>
            ) : (
              designations.map((desig) => (
                <TableRow key={desig.id}>
                  <TableCell>{desig.title}</TableCell>
                  <TableCell>
                    <Chip label={desig.code} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={`Level ${desig.level}`} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    {desig.min_salary && desig.max_salary
                      ? `৳${desig.min_salary.toLocaleString()} - ৳${desig.max_salary.toLocaleString()}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={desig.is_active ? "Active" : "Inactive"}
                      color={desig.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(desig)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(desig.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDesig ? "Edit Designation" : "Add Designation"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            label="Title"
            fullWidth
            margin="normal"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            helperText="Unique code (e.g., PRIN, TEACH)"
          />
          
          <TextField
            label="Hierarchy Level"
            fullWidth
            margin="normal"
            type="number"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 5 })}
            helperText="1 = Highest (Principal), 10 = Lowest"
            inputProps={{ min: 1, max: 10 }}
          />
          
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Min Salary"
              fullWidth
              margin="normal"
              type="number"
              value={formData.min_salary || ""}
              onChange={(e) => setFormData({ ...formData, min_salary: parseFloat(e.target.value) || undefined })}
            />
            <TextField
              label="Max Salary"
              fullWidth
              margin="normal"
              type="number"
              value={formData.max_salary || ""}
              onChange={(e) => setFormData({ ...formData, max_salary: parseFloat(e.target.value) || undefined })}
            />
          </Box>
          
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingDesig ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// LEAVE TYPES SECTION
// ============================================================================

function LeaveTypesSection() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [formData, setFormData] = useState<LeaveTypeCreate>({
    name: "",
    code: "",
    days_per_year: 10,
    requires_approval: true,
    is_paid: true,
    color: "#1976d2",
    is_active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    setLoading(true);
    const result = await listLeaveTypes();
    if (result.ok && result.data) {
      setLeaveTypes(result.data as LeaveType[]);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingType(null);
    setFormData({
      name: "",
      code: "",
      days_per_year: 10,
      requires_approval: true,
      is_paid: true,
      color: "#1976d2",
      is_active: true,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleEdit = (type: LeaveType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      days_per_year: type.days_per_year,
      requires_approval: type.requires_approval,
      max_consecutive_days: type.max_consecutive_days,
      is_paid: type.is_paid,
      color: type.color,
      description: type.description,
      is_active: type.is_active,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    
    if (!formData.name || !formData.code) {
      setError("Name and Code are required");
      return;
    }

    const result = editingType
      ? await updateLeaveType(editingType.id, formData)
      : await createLeaveType(formData);

    if (result.ok) {
      setDialogOpen(false);
      loadLeaveTypes();
    } else {
      setError("Failed to save leave type");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return;
    
    const result = await deleteLeaveType(id);
    if (result.ok) {
      loadLeaveTypes();
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Leave Types</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Add Leave Type
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Days/Year</TableCell>
              <TableCell>Max Consecutive</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">Loading...</TableCell>
              </TableRow>
            ) : leaveTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No leave types found</TableCell>
              </TableRow>
            ) : (
              leaveTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: 1,
                          bgcolor: type.color,
                        }}
                      />
                      {type.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={type.code} size="small" />
                  </TableCell>
                  <TableCell>{type.days_per_year}</TableCell>
                  <TableCell>{type.max_consecutive_days || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={type.is_paid ? "Paid" : "Unpaid"}
                      color={type.is_paid ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={type.is_active ? "Active" : "Inactive"}
                      color={type.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(type)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(type.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingType ? "Edit Leave Type" : "Add Leave Type"}
        </DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
            helperText="Unique code (e.g., SL, CL, AL)"
          />
          
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Days Per Year"
              fullWidth
              margin="normal"
              type="number"
              value={formData.days_per_year}
              onChange={(e) => setFormData({ ...formData, days_per_year: parseInt(e.target.value) || 0 })}
              required
            />
            <TextField
              label="Max Consecutive Days"
              fullWidth
              margin="normal"
              type="number"
              value={formData.max_consecutive_days || ""}
              onChange={(e) => setFormData({ ...formData, max_consecutive_days: parseInt(e.target.value) || undefined })}
            />
          </Box>
          
          <TextField
            label="Color"
            fullWidth
            margin="normal"
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            helperText="Color for calendar display"
          />
          
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.requires_approval}
                onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
              />
            }
            label="Requires Approval"
            sx={{ mt: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_paid}
                onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
              />
            }
            label="Paid Leave"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingType ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
