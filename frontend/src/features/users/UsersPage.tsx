import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Avatar,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Key as KeyIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  SupervisorAccount as AdminIcon,
  FamilyRestroom as ParentIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  AccountCircle as AccountIcon,
} from "@mui/icons-material";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  type User,
  type Role,
} from "../../api/people";

// --- Components ---

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{ height: "100%", boxShadow: 2, borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              p: 1.5,
              borderRadius: "12px",
              bgcolor: `${color}15`, // 15% opacity
              color: color,
              display: "flex",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight="500">
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Initial form state
const initialForm = {
  email: "",
  full_name: "",
  role_name: "",
  password: "",
  is_active: true,
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [search, setSearch] = useState("");
  const [tabValue, setTabValue] = useState(0); // 0=All, 1=Students, 2=Teachers, 3=Parents, 4=Admins

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password Reset Dialog
  const [openPwdDialog, setOpenPwdDialog] = useState(false);
  const [pwdFormData, setPwdFormData] = useState({ password: "", confirm: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(1, 2000), // Fetch sufficient users
        getRoles(),
      ]);
      setUsers(usersRes.items);
      setRoles(rolesRes);
    } catch (err: any) {
      console.error("Failed to load users", err);
      setError("Failed to load users. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData(initialForm);
    setFormError(null);
    setOpenDialog(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || "",
      role_name: user.role_name || "",
      password: "", 
      is_active: user.is_active,
    });
    setFormError(null);
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteUser(id);
      loadData();
    } catch (err: any) {
      alert("Failed to delete user: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!formData.email || !formData.role_name) {
      setFormError("Email and Role are required");
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError("Password is required for new users");
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        const updatePayload: any = {
          email: formData.email,
          role_name: formData.role_name,
          full_name: formData.full_name,
          is_active: formData.is_active,
        };
        if (formData.password) updatePayload.password = formData.password;
        await updateUser(editingUser.id, updatePayload);
      } else {
        await createUser(formData);
      }
      setOpenDialog(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to save user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = (user: User) => {
    setEditingUser(user);
    setPwdFormData({ password: "", confirm: "" });
    setOpenPwdDialog(true);
  };

  const handleSavePassword = async () => {
    if (pwdFormData.password !== pwdFormData.confirm) {
      alert("Passwords do not match");
      return;
    }
    if (pwdFormData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    if (!editingUser) return;

    setSubmitting(true);
    try {
      await updateUser(editingUser.id, { password: pwdFormData.password });
      setOpenPwdDialog(false);
      alert("Password updated successfully");
    } catch (err: any) {
      alert("Failed to update password: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Logic for Tabs
  const getTabRoleFilter = (tabIndex: number) => {
    switch (tabIndex) {
      case 1: return "student";
      case 2: return "teacher";
      case 3: return "parent";
      case 4: return "admin"; // Catch-all for admins
      default: return "all";
    }
  };

  const roleFilter = getTabRoleFilter(tabValue);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(term) ||
      (u.full_name || "").toLowerCase().includes(term);
    
    let matchesRole = true;
    if (roleFilter !== "all") {
        if (roleFilter === "admin") {
            matchesRole = ["super_admin", "admin", "school_admin"].includes(u.role_name || "");
        } else {
            matchesRole = u.role_name === roleFilter;
        }
    }
    return matchesSearch && matchesRole;
  });

  // Calculate Stats
  const totalUsers = users.length;
  const totalStudents = users.filter(u => u.role_name === "student").length;
  const totalTeachers = users.filter(u => u.role_name === "teacher").length;
  const totalParents = users.filter(u => u.role_name === "parent").length;

  return (
    <Box sx={{ width: "100%", p: { xs: 1, md: 3 } }}>
      
      {/* Header */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "start", sm: "center" }} mb={4} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="text.primary">
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={0.5}>
            Manage system access, roles, and credentials
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          sx={{ borderRadius: "10px", textTransform: "none", px: 3, boxShadow: 4 }}
        >
          Add New User
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Users" value={totalUsers} icon={<PersonIcon fontSize="large" />} color="#6366f1" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Students" value={totalStudents} icon={<SchoolIcon fontSize="large" />} color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Teachers" value={totalTeachers} icon={<BadgeIcon fontSize="large" />} color="#f59e0b" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Parents" value={totalParents} icon={<ParentIcon fontSize="large" />} color="#ec4899" />
        </Grid>
      </Grid>

      {/* Tabs & Search */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: "hidden" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="center" sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 2, pb: { xs: 2, md: 0 } }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
                "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 48 },
            }}
          >
            <Tab label="All Users" iconPosition="start" icon={<PersonIcon fontSize="small" />} />
            <Tab label="Students" iconPosition="start" icon={<SchoolIcon fontSize="small" />} />
            <Tab label="Teachers" iconPosition="start" icon={<BadgeIcon fontSize="small" />} />
            <Tab label="Parents" iconPosition="start" icon={<ParentIcon fontSize="small" />} />
            <Tab label="Admins" iconPosition="start" icon={<AdminIcon fontSize="small" />} />
          </Tabs>
          
          <Box sx={{ p: 1, width: { xs: "100%", md: "auto" } }}>
            <TextField
                size="small"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon color="action" fontSize="small" />
                        </InputAdornment>
                    ),
                }}
                sx={{ width: { xs: "100%", md: 250 } }}
            />
          </Box>
        </Stack>

        {/* Data Table */}
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "grey.50" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>USER DETAILS</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>ROLE</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "text.secondary" }} align="right">ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No users found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                    <TableCell>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40, fontSize: 16, fontWeight: "bold" }}>
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                                <Typography variant="subtitle2" fontWeight="600">
                                    {user.full_name || "Unknown Name"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user.email}
                                </Typography>
                            </Box>
                        </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={
                            user.role_name?.includes("student") ? <SchoolIcon fontSize="small" /> :
                            user.role_name?.includes("teacher") ? <BadgeIcon fontSize="small" /> :
                            user.role_name?.includes("parent") ? <ParentIcon fontSize="small" /> :
                            <AdminIcon fontSize="small" />
                        }
                        label={user.role_name ? user.role_name.replace("_", " ").toUpperCase() : "USER"}
                        size="small"
                        color="default"
                        variant="outlined"
                        sx={{ fontWeight: 500, borderRadius: "6px" }}
                      />
                    </TableCell>
                    <TableCell>
                        <Chip
                            icon={user.is_active ? <ActiveIcon fontSize="small" /> : <InactiveIcon fontSize="small" />}
                            label={user.is_active ? "Active" : "Inactive"}
                            size="small"
                            color={user.is_active ? "success" : "default"}
                            sx={{ fontWeight: 500 }}
                        />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Tooltip title="Change Password">
                            <IconButton size="small" onClick={() => handleChangePassword(user)} sx={{ color: "warning.main", bgcolor: "warning.lighter" }}>
                                <KeyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Profile">
                            <IconButton size="small" onClick={() => handleEdit(user)} sx={{ color: "primary.main", bgcolor: "primary.lighter" }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                            <IconButton size="small" onClick={() => handleDelete(user.id)} sx={{ color: "error.main", bgcolor: "error.lighter" }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Modal - Professional Redesign */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth TransitionProps={{ unmountOnExit: true }}>
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white", py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <AccountIcon />
                <Typography variant="h6" fontWeight="bold">
                    {editingUser ? "Edit User Profile" : "Create New User"}
                </Typography>
            </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
            
            <Box>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1 }}>
                    Personal Information
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Full Name"
                            placeholder="e.g. John Doe"
                            fullWidth
                            variant="outlined"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Email Address"
                            placeholder="e.g. john@school.com"
                            fullWidth
                            required
                            type="email"
                            variant="outlined"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            helperText="This email will be used for system login."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                </Grid>
            </Box>
            
            <Divider />

            <Box>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" sx={{ mb: 1.5, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: 1 }}>
                    System Access
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={formData.role_name}
                            label="Role"
                            onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                            startAdornment={
                                <InputAdornment position="start" sx={{ pl: 1 }}>
                                    <BadgeIcon color="action" fontSize="small" />
                                </InputAdornment>
                            }
                        >
                            {roles.map((r) => (
                            <MenuItem key={r.id} value={r.name}>
                                {r.name.replace("_", " ").toUpperCase()}
                            </MenuItem>
                            ))}
                        </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                        <InputLabel>Account Status</InputLabel>
                        <Select
                            value={formData.is_active ? "active" : "inactive"}
                            label="Account Status"
                            onChange={(e) =>
                            setFormData({ ...formData, is_active: e.target.value === "active" })
                            }
                            startAdornment={
                                <InputAdornment position="start" sx={{ pl: 1 }}>
                                    {formData.is_active ? 
                                        <ActiveIcon color="success" fontSize="small" /> : 
                                        <InactiveIcon color="error" fontSize="small" />
                                    }
                                </InputAdornment>
                            }
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </Select>
                        </FormControl>
                    </Grid>
                    
                    {!editingUser && (
                        <Grid item xs={12}>
                        <TextField
                            label="Initial Password"
                            type="password"
                            fullWidth
                            required
                            variant="outlined"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            helperText="Must be at least 6 characters long."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        </Grid>
                    )}
                </Grid>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: "grey.50" }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit" size="large" sx={{ mr: 1 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" size="large" disabled={submitting} sx={{ borderRadius: "8px", px: 4 }}>
            {submitting ? "Saving..." : editingUser ? "Update Profile" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={openPwdDialog} onClose={() => setOpenPwdDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Reset Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
                This will immediately change the password for <strong>{editingUser?.email}</strong>.
            </Alert>
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={pwdFormData.password}
              onChange={(e) => setPwdFormData({ ...pwdFormData, password: e.target.value })}
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={pwdFormData.confirm}
              onChange={(e) => setPwdFormData({ ...pwdFormData, confirm: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenPwdDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSavePassword} variant="contained" color="warning" disabled={submitting}>
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
