import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import { getStaff, type Staff } from "../../api/people";

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await getStaff();
        setStaff(res.items);
      } catch (err) {
        console.error("Failed to load staff", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Staff Management
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.employee_id}</TableCell>
                  <TableCell>
                    {row.first_name} {row.last_name}
                  </TableCell>
                  <TableCell>{row.job_title || "-"}</TableCell>
                  <TableCell>{row.email || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.is_active ? "Active" : "Inactive"}
                      color={row.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No staff found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
