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
  getAssets,
  createAsset,
  updateAsset,
} from "../../../../api/logistics";
import type { Asset, AssetStatus } from "../../logisticsTypes";
import ListFiltersBar from "../shared/ListFiltersBar";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";

export default function AssetsTab() {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [assetToRetire, setAssetToRetire] = useState<Asset | null>(null);

  const [form, setForm] = useState({
    tag: "",
    serial_no: "",
    name: "",
    category: "",
    location: "",
    custodian_user_id: "",
    status: "in_use" as AssetStatus,
  });

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAssets({
        q: search || undefined,
        status: statusFilter as AssetStatus | undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setAssets(result.items);
      setTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load assets" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, rowsPerPage]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleCreate = async () => {
    try {
      await createAsset({
        tag: form.tag,
        serial_no: form.serial_no || undefined,
        name: form.name,
        category: form.category,
        location: form.location,
        custodian_user_id: form.custodian_user_id || undefined,
        status: form.status,
      });
      showToast({ severity: "success", message: "Asset created successfully" });
      setDialogOpen(false);
      resetForm();
      loadAssets();
    } catch {
      showToast({ severity: "error", message: "Failed to create asset" });
    }
  };

  const handleUpdate = async () => {
    if (!editingAsset) return;
    try {
      await updateAsset(editingAsset.id, {
        tag: form.tag,
        serial_no: form.serial_no || undefined,
        name: form.name,
        category: form.category,
        location: form.location,
        custodian_user_id: form.custodian_user_id || undefined,
        status: form.status,
      });
      showToast({ severity: "success", message: "Asset updated successfully" });
      setDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      loadAssets();
    } catch {
      showToast({ severity: "error", message: "Failed to update asset" });
    }
  };

  const resetForm = () => {
    setForm({
      tag: "",
      serial_no: "",
      name: "",
      category: "",
      location: "",
      custodian_user_id: "",
      status: "in_use",
    });
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      tag: asset.tag,
      serial_no: asset.serial_no || "",
      name: asset.name,
      category: asset.category,
      location: asset.location,
      custodian_user_id: asset.custodian_user_id || "",
      status: asset.status,
    });
    setDialogOpen(true);
  };

  const openRetire = (asset: Asset) => {
    setAssetToRetire(asset);
    setRetireDialogOpen(true);
  };

  const handleRetire = async () => {
    if (!assetToRetire) return;
    try {
      await updateAsset(assetToRetire.id, { status: "retired" });
      showToast({ severity: "success", message: "Asset retired" });
      setRetireDialogOpen(false);
      setAssetToRetire(null);
      loadAssets();
    } catch {
      showToast({ severity: "error", message: "Failed to retire asset" });
    }
  };

  return (
    <Box>
      <ListFiltersBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search assets by tag, name, or category..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "in_use", label: "In Use" },
          { value: "in_repair", label: "In Repair" },
          { value: "retired", label: "Retired" },
        ]}
        onRefresh={loadAssets}
        loading={loading}
      />

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setEditingAsset(null);
            setDialogOpen(true);
          }}
        >
          Add Asset
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
                    <TableCell>Tag</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Serial No.</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{asset.tag}</Typography>
                      </TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell>{asset.serial_no || "-"}</TableCell>
                      <TableCell>
                        <StatusChip status={asset.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(asset)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Retire">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openRetire(asset)}
                              disabled={asset.status === "retired"}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {assets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                        <Typography color="text.secondary">
                          No assets found
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
              onRowsPerPageChange={(e) => setRowsPerPage(Number(e.target.value))}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Paper>

      {/* Asset Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingAsset(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Asset Tag"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Serial Number"
                value={form.serial_no}
                onChange={(e) => setForm({ ...form, serial_no: e.target.value })}
              />
            </Grid>
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
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
                placeholder="e.g., Computer, Furniture, Vehicle"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                placeholder="e.g., Room 101, Lab A"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Custodian User ID"
                value={form.custodian_user_id}
                onChange={(e) => setForm({ ...form, custodian_user_id: e.target.value })}
                placeholder="Optional"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
                >
                  <MenuItem value="in_use">In Use</MenuItem>
                  <MenuItem value="in_repair">In Repair</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDialogOpen(false);
            setEditingAsset(null);
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingAsset ? handleUpdate : handleCreate}
          >
            {editingAsset ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={retireDialogOpen}
        onClose={() => {
          setRetireDialogOpen(false);
          setAssetToRetire(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Retire Asset</DialogTitle>
        <DialogContent>
          <Typography>
            Retire{" "}
            <Typography component="span" fontWeight={700}>
              {assetToRetire?.tag} - {assetToRetire?.name}
            </Typography>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRetireDialogOpen(false);
              setAssetToRetire(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleRetire}>
            Retire
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
