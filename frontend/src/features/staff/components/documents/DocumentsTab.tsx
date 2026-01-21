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
  Chip,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import { Add, Description, Warning } from "@mui/icons-material";

const mockContracts = [
  {
    id: "1",
    staff_name: "John Doe",
    contract_type: "Permanent",
    start_date: "2023-01-15",
    end_date: null,
    status: "active",
  },
  {
    id: "2",
    staff_name: "Jane Smith",
    contract_type: "Contract",
    start_date: "2023-06-01",
    end_date: "2024-05-31",
    status: "active",
  },
  {
    id: "3",
    staff_name: "Bob Johnson",
    contract_type: "Temporary",
    start_date: "2023-09-01",
    end_date: "2024-02-28",
    status: "expiring_soon",
  },
];

export default function DocumentsTab() {
  const [activeTab, setActiveTab] = useState(0);

  const expiringContracts = mockContracts.filter(
    (c) => c.status === "expiring_soon"
  );

  return (
    <Box>
      {/* Expiring Contracts Alert */}
      {expiringContracts.length > 0 && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 2 }}>
          {expiringContracts.length} contract(s) expiring soon! Please review and renew.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Contracts" />
          <Tab label="Documents Library" />
        </Tabs>
      </Paper>

      {/* Tab 1: Contracts */}
      {activeTab === 0 && (
        <>
          {/* Actions */}
          <Box sx={{ mb: 2, textAlign: "right" }}>
            <Button variant="contained" startIcon={<Add />}>
              Add Contract
            </Button>
          </Box>

          {/* Contracts Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Staff Member</TableCell>
                  <TableCell>Contract Type</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {contract.staff_name}
                      </Typography>
                    </TableCell>
                    <TableCell>{contract.contract_type}</TableCell>
                    <TableCell>{contract.start_date}</TableCell>
                    <TableCell>{contract.end_date || "Ongoing"}</TableCell>
                    <TableCell>
                      <Chip
                        label={contract.status.replace("_", " ")}
                        color={
                          contract.status === "active"
                            ? "success"
                            : contract.status === "expiring_soon"
                            ? "warning"
                            : "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Description />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Tab 2: Documents Library */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documents Library
          </Typography>
          <Typography color="text.secondary">
            Coming soon - Upload and manage staff documents (certificates, IDs, etc.)
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
