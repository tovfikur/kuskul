import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Delete, Edit } from "@mui/icons-material";
import {
  getVendors,
  createVendor,
  updateVendor,
} from "../../../../api/logistics";
import type { Vendor } from "../../logisticsTypes";
import ListFiltersBar from "../shared/ListFiltersBar";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";

export default function VendorsTab() {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [vendorToDeactivate, setVendorToDeactivate] = useState<Vendor | null>(
    null,
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    status: "active" as "active" | "inactive",
  });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getVendors({
        q: search || undefined,
        status: statusFilter || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setVendors(result.items);
      setTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load vendors" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, rowsPerPage]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleCreate = async () => {
    try {
      await createVendor({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        status: form.status,
      });
      showToast({
        severity: "success",
        message: "Vendor created successfully",
      });
      setDialogOpen(false);
      resetForm();
      loadVendors();
    } catch {
      showToast({ severity: "error", message: "Failed to create vendor" });
    }
  };

  const handleUpdate = async () => {
    if (!editingVendor) return;
    try {
      await updateVendor(editingVendor.id, {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        status: form.status,
      });
      showToast({
        severity: "success",
        message: "Vendor updated successfully",
      });
      setDialogOpen(false);
      setEditingVendor(null);
      resetForm();
      loadVendors();
    } catch {
      showToast({ severity: "error", message: "Failed to update vendor" });
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      status: "active",
    });
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      status: vendor.status,
    });
    setDialogOpen(true);
  };

  const openDeactivate = (vendor: Vendor) => {
    setVendorToDeactivate(vendor);
    setDeactivateDialogOpen(true);
  };

  const handleDeactivate = async () => {
    if (!vendorToDeactivate) return;
    try {
      await updateVendor(vendorToDeactivate.id, { status: "inactive" });
      showToast({ severity: "success", message: "Vendor deactivated" });
      setDeactivateDialogOpen(false);
      setVendorToDeactivate(null);
      loadVendors();
    } catch {
      showToast({ severity: "error", message: "Failed to deactivate vendor" });
    }
  };

  return (
    <Box>
      <ListFiltersBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendors by name, phone, or email..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
        onRefresh={loadVendors}
        loading={loading}
      />

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setEditingVendor(null);
            setDialogOpen(true);
          }}
        >
          Add Vendor
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{vendor.name}</Typography>
                      </TableCell>
                      <TableCell>{vendor.phone || "-"}</TableCell>
                      <TableCell>{vendor.email || "-"}</TableCell>
                      <TableCell>
                        <StatusChip status={vendor.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(vendor)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openDeactivate(vendor)}
                              disabled={vendor.status === "inactive"}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendors.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ textAlign: "center", py: 4 }}
                      >
                        <Typography color="text.secondary">
                          No vendors found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) =>
                setRowsPerPage(Number(e.target.value))
              }
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>

      {/* Vendor Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingVendor(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingVendor ? "Edit Vendor" : "Add Vendor"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingVendor(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingVendor ? handleUpdate : handleCreate}
          >
            {editingVendor ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivateDialogOpen}
        onClose={() => {
          setDeactivateDialogOpen(false);
          setVendorToDeactivate(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate Vendor</DialogTitle>
        <DialogContent>
          <Typography>
            Deactivate{" "}
            <Typography component="span" fontWeight={700}>
              {vendorToDeactivate?.name}
            </Typography>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeactivateDialogOpen(false);
              setVendorToDeactivate(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeactivate}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
