import { useState, useEffect } from "react";
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
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add,
  CheckCircle,
  Cancel,
  Pending,
  CalendarMonth,
} from "@mui/icons-material";

// Placeholder - will be replaced with actual API
const mockLeaveRequests = [
  {
    id: "1",
    staff_name: "John Doe",
    leave_type: "Sick Leave",
    start_date: "2024-01-15",
    end_date: "2024-01-17",
    total_days: 3,
    status: "pending",
    reason: "Medical appointment",
  },
  {
    id: "2",
    staff_name: "Jane Smith",
    leave_type: "Casual Leave",
    start_date: "2024-01-20",
    end_date: "2024-01-21",
    total_days: 2,
    status: "approved",
    reason: "Personal work",
  },
];

export default function LeaveTab() {
  const [activeTab, setActiveTab] = useState(0);
  const [requests, setRequests] = useState(mockLeaveRequests);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [error, setError] = useState("");

  // Stats
  const [stats, setStats] = useState({
    pending: 1,
    approved: 1,
    rejected: 0,
    total: 2,
  });

  const handleAdd = () => {
    setFormData({
      staff_id: "",
      leave_type_id: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setError("");
    
    if (!formData.staff_id || !formData.leave_type_id || !formData.start_date || !formData.end_date) {
      setError("All fields are required");
      return;
    }

    // TODO: Call API to create leave request
    setDialogOpen(false);
  };

  const handleApprove = async (id: string) => {
    // TODO: Call API to approve request
    setRequests(requests.map(r => 
      r.id === id ? { ...r, status: "approved" } : r
    ));
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;
    
    // TODO: Call API to reject request
    setRequests(requests.map(r => 
      r.id === id ? { ...r, status: "rejected" } : r
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "error";
      case "pending": return "warning";
      default: return "default";
    }
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (typeFilter && req.leave_type !== typeFilter) return false;
    return true;
  });

  return (
    <Box>
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Leave Requests" />
          <Tab label="Leave Balances" />
          <Tab label="Leave Calendar" />
        </Tabs>
      </Paper>

      {/* Tab 1: Leave Requests */}
      {activeTab === 0 && (
        <>
          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Pending color="warning" />
                    <Box>
                      <Typography variant="h4">{stats.pending}</Typography>
                      <Typography color="text.secondary">Pending</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CheckCircle color="success" />
                    <Box>
                      <Typography variant="h4">{stats.approved}</Typography>
                      <Typography color="text.secondary">Approved</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Cancel color="error" />
                    <Box>
                      <Typography variant="h4">{stats.rejected}</Typography>
                      <Typography color="text.secondary">Rejected</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <CalendarMonth color="primary" />
                    <Box>
                      <Typography variant="h4">{stats.total}</Typography>
                      <Typography color="text.secondary">Total Requests</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filters and Actions */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Leave Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="Sick Leave">Sick Leave</MenuItem>
                  <MenuItem value="Casual Leave">Casual Leave</MenuItem>
                  <MenuItem value="Annual Leave">Annual Leave</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6} sx={{ textAlign: "right" }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAdd}
                >
                  Request Leave
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Requests Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">Loading...</TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No leave requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {request.staff_name}
                          </Typography>
                        </TableCell>
                        <TableCell>{request.leave_type}</TableCell>
                        <TableCell>{request.start_date}</TableCell>
                        <TableCell>{request.end_date}</TableCell>
                        <TableCell>
                          <Chip label={`${request.total_days} days`} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {request.reason}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={request.status}
                            color={getStatusColor(request.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="small"
                                color="success"
                                onClick={() => handleApprove(request.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleReject(request.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredRequests.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </TableContainer>
        </>
      )}

      {/* Tab 2: Leave Balances */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Leave Balances
          </Typography>
          <Typography color="text.secondary">
            Coming soon - View and manage staff leave balances
          </Typography>
        </Paper>
      )}

      {/* Tab 3: Leave Calendar */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Leave Calendar
          </Typography>
          <Typography color="text.secondary">
            Coming soon - Visual calendar view of all leave requests
          </Typography>
        </Paper>
      )}

      {/* Request Leave Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Leave</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Staff Member"
                fullWidth
                select
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                required
              >
                <MenuItem value="">Select Staff</MenuItem>
                <MenuItem value="1">John Doe</MenuItem>
                <MenuItem value="2">Jane Smith</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Leave Type"
                fullWidth
                select
                value={formData.leave_type_id}
                onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                required
              >
                <MenuItem value="">Select Type</MenuItem>
                <MenuItem value="1">Sick Leave</MenuItem>
                <MenuItem value="2">Casual Leave</MenuItem>
                <MenuItem value="3">Annual Leave</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                fullWidth
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                fullWidth
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reason"
                fullWidth
                multiline
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
