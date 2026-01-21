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
  Tabs,
  Tab,
} from "@mui/material";
import { Add, AttachMoney, Receipt } from "@mui/icons-material";

const mockPayrollCycles = [
  {
    id: "1",
    month: "January",
    year: 2024,
    status: "completed",
    total_amount: 150000,
    staff_count: 25,
  },
  {
    id: "2",
    month: "December",
    year: 2023,
    status: "paid",
    total_amount: 148000,
    staff_count: 24,
  },
];

export default function PayrollTab() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Payroll Cycles" />
          <Tab label="Payslips" />
        </Tabs>
      </Paper>

      {/* Tab 1: Payroll Cycles */}
      {activeTab === 0 && (
        <>
          {/* Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <AttachMoney color="primary" />
                    <Box>
                      <Typography variant="h5">$150,000</Typography>
                      <Typography color="text.secondary">Current Month</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Receipt color="success" />
                    <Box>
                      <Typography variant="h5">25</Typography>
                      <Typography color="text.secondary">Staff Members</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ mb: 2, textAlign: "right" }}>
            <Button variant="contained" startIcon={<Add />}>
              Create Payroll Cycle
            </Button>
          </Box>

          {/* Cycles Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Period</TableCell>
                  <TableCell>Staff Count</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockPayrollCycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {cycle.month} {cycle.year}
                      </Typography>
                    </TableCell>
                    <TableCell>{cycle.staff_count}</TableCell>
                    <TableCell>${cycle.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={cycle.status}
                        color={cycle.status === "paid" ? "success" : "primary"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Tab 2: Payslips */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payslips
          </Typography>
          <Typography color="text.secondary">
            Coming soon - View and download individual payslips
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
