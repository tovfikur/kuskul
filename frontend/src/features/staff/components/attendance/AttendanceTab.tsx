import { useState } from "react";
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
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
} from "@mui/material";
import { CheckCircle, Cancel, AccessTime } from "@mui/icons-material";

const mockAttendance = [
  {
    id: "1",
    staff_name: "John Doe",
    check_in: "09:00 AM",
    check_out: "05:30 PM",
    status: "present",
    hours: 8.5,
  },
  {
    id: "2",
    staff_name: "Jane Smith",
    check_in: "09:15 AM",
    check_out: "05:00 PM",
    status: "present",
    hours: 7.75,
  },
  {
    id: "3",
    staff_name: "Bob Johnson",
    check_in: "-",
    check_out: "-",
    status: "absent",
    hours: 0,
  },
];

export default function AttendanceTab() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const stats = {
    present: 2,
    absent: 1,
    late: 0,
    total: 3,
  };

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h4">{stats.present}</Typography>
                  <Typography color="text.secondary">Present</Typography>
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
                  <Typography variant="h4">{stats.absent}</Typography>
                  <Typography color="text.secondary">Absent</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <AccessTime color="warning" />
                <Box>
                  <Typography variant="h4">{stats.late}</Typography>
                  <Typography color="text.secondary">Late</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography color="text.secondary">Total Staff</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Date Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Select Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={8} sx={{ textAlign: "right" }}>
            <Button variant="outlined" sx={{ mr: 1 }}>
              Mark All Present
            </Button>
            <Button variant="contained">Export Report</Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Attendance Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Staff Member</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockAttendance.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {record.staff_name}
                  </Typography>
                </TableCell>
                <TableCell>{record.check_in}</TableCell>
                <TableCell>{record.check_out}</TableCell>
                <TableCell>{record.hours}h</TableCell>
                <TableCell>
                  <Chip
                    label={record.status}
                    color={record.status === "present" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small">Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
