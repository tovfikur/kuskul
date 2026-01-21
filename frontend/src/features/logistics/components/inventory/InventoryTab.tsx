import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
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
  Checkbox,
  FormControlLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Edit } from "@mui/icons-material";
import {
  getInventoryItems,
  getInventoryLocations,
  getStockOnHand,
  createInventoryItem,
  updateInventoryItem,
  createInventoryLocation,
  updateInventoryLocation,
  createStockMovement,
} from "../../../../api/logistics";
import type {
  InventoryItem,
  InventoryLocation,
  StockOnHandRow,
  StockMovementType,
} from "../../logisticsTypes";
import ListFiltersBar from "../shared/ListFiltersBar";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";

export default function InventoryTab() {
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Items state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [itemsSearch, setItemsSearch] = useState("");

  // Locations state
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  // Stock on hand state
  const [stockOnHand, setStockOnHand] = useState<StockOnHandRow[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);

  // Form states
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    uom: "",
    reorder_level: "",
    is_active: true,
  });

  const [locationForm, setLocationForm] = useState({
    code: "",
    name: "",
    is_active: true,
  });

  const [movementForm, setMovementForm] = useState({
    item_id: "",
    location_id: "",
    type: "receive" as StockMovementType,
    qty: "",
    note: "",
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInventoryItems({
        q: itemsSearch || undefined,
        limit: itemsPerPage,
        offset: itemsPage * itemsPerPage,
      });
      setItems(result.items);
      setItemsTotal(result.total);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load inventory items" });
    } finally {
      setLoading(false);
    }
  }, [itemsSearch, itemsPage, itemsPerPage]);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInventoryLocations({ limit: 100, offset: 0 });
      setLocations(result.items);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load locations" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStockOnHand = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockOnHand({
        location_id: selectedLocation || undefined,
      });
      setStockOnHand(result);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load stock on hand" });
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (subTab === 0) loadItems();
    else if (subTab === 1) loadStockOnHand();
    else if (subTab === 2) loadLocations();
  }, [subTab, loadItems, loadStockOnHand, loadLocations]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const handleCreateItem = async () => {
    try {
      await createInventoryItem({
        sku: itemForm.sku,
        name: itemForm.name,
        uom: itemForm.uom,
        reorder_level: itemForm.reorder_level ? Number(itemForm.reorder_level) : undefined,
        is_active: itemForm.is_active,
      });
      showToast({ severity: "success", message: "Item created successfully" });
      setItemDialogOpen(false);
      resetItemForm();
      loadItems();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to create item" });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      await updateInventoryItem(editingItem.id, {
        sku: itemForm.sku,
        name: itemForm.name,
        uom: itemForm.uom,
        reorder_level: itemForm.reorder_level ? Number(itemForm.reorder_level) : undefined,
        is_active: itemForm.is_active,
      });
      showToast({ severity: "success", message: "Item updated successfully" });
      setItemDialogOpen(false);
      setEditingItem(null);
      resetItemForm();
      loadItems();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to update item" });
    }
  };

  const handleCreateLocation = async () => {
    try {
      await createInventoryLocation({
        code: locationForm.code,
        name: locationForm.name,
        is_active: locationForm.is_active,
      });
      showToast({ severity: "success", message: "Location created successfully" });
      setLocationDialogOpen(false);
      resetLocationForm();
      loadLocations();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to create location" });
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;
    try {
      await updateInventoryLocation(editingLocation.id, {
        code: locationForm.code,
        name: locationForm.name,
        is_active: locationForm.is_active,
      });
      showToast({ severity: "success", message: "Location updated successfully" });
      setLocationDialogOpen(false);
      setEditingLocation(null);
      resetLocationForm();
      loadLocations();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to update location" });
    }
  };

  const handleRecordMovement = async () => {
    try {
      await createStockMovement({
        item_id: movementForm.item_id,
        location_id: movementForm.location_id,
        type: movementForm.type,
        qty: Number(movementForm.qty),
        note: movementForm.note || undefined,
      });
      showToast({ severity: "success", message: "Stock movement recorded" });
      setMovementDialogOpen(false);
      resetMovementForm();
      loadStockOnHand();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to record movement" });
    }
  };

  const resetItemForm = () => {
    setItemForm({
      sku: "",
      name: "",
      uom: "",
      reorder_level: "",
      is_active: true,
    });
  };

  const resetLocationForm = () => {
    setLocationForm({
      code: "",
      name: "",
      is_active: true,
    });
  };

  const resetMovementForm = () => {
    setMovementForm({
      item_id: "",
      location_id: "",
      type: "receive",
      qty: "",
      note: "",
    });
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      uom: item.uom,
      reorder_level: item.reorder_level?.toString() || "",
      is_active: item.is_active,
    });
    setItemDialogOpen(true);
  };

  const openEditLocation = (location: InventoryLocation) => {
    setEditingLocation(location);
    setLocationForm({
      code: location.code,
      name: location.name,
      is_active: location.is_active,
    });
    setLocationDialogOpen(true);
  };

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Items" />
        <Tab label="Stock on Hand" />
        <Tab label="Locations" />
      </Tabs>

      {/* Items Tab */}
      {subTab === 0 && (
        <Box>
          <ListFiltersBar
            searchValue={itemsSearch}
            onSearchChange={setItemsSearch}
            searchPlaceholder="Search items by SKU or name..."
            onRefresh={loadItems}
            loading={loading}
          />

          <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetItemForm();
                setEditingItem(null);
                setItemDialogOpen(true);
              }}
            >
              Add Item
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                resetMovementForm();
                setMovementDialogOpen(true);
              }}
            >
              Record Movement
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
                        <TableCell>SKU</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>UoM</TableCell>
                        <TableCell>Reorder Level</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{item.sku}</Typography>
                          </TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>{item.reorder_level || "-"}</TableCell>
                          <TableCell>
                            <StatusChip status={item.is_active ? "active" : "inactive"} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditItem(item)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">
                              No inventory items found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={itemsTotal}
                  page={itemsPage}
                  onPageChange={(_, p) => setItemsPage(p)}
                  rowsPerPage={itemsPerPage}
                  onRowsPerPageChange={(e) => setItemsPerPage(Number(e.target.value))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* Stock on Hand Tab */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Location</InputLabel>
              <Select
                value={selectedLocation}
                label="Filter by Location"
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={loadStockOnHand}>
              Refresh
            </Button>
          </Box>

          <Paper sx={{ borderRadius: 3 }}>
            {loading ? (
              <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>UoM</TableCell>
                      <TableCell align="right">Qty on Hand</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockOnHand.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{row.sku}</Typography>
                        </TableCell>
                        <TableCell>{row.item_name}</TableCell>
                        <TableCell>{row.location_name}</TableCell>
                        <TableCell>{row.uom}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{row.qty_on_hand}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stockOnHand.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">
                            No stock records found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Locations Tab */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetLocationForm();
                setEditingLocation(null);
                setLocationDialogOpen(true);
              }}
            >
              Add Location
            </Button>
          </Box>

          <Paper sx={{ borderRadius: 3 }}>
            {loading ? (
              <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{loc.code}</Typography>
                        </TableCell>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell>
                          <StatusChip status={loc.is_active ? "active" : "inactive"} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEditLocation(loc)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">
                            No locations found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      )}

      {/* Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => {
          setItemDialogOpen(false);
          setEditingItem(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="SKU"
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Unit of Measure"
                value={itemForm.uom}
                onChange={(e) => setItemForm({ ...itemForm, uom: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Reorder Level"
                type="number"
                value={itemForm.reorder_level}
                onChange={(e) => setItemForm({ ...itemForm, reorder_level: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={itemForm.is_active}
                    onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setItemDialogOpen(false);
            setEditingItem(null);
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingItem ? handleUpdateItem : handleCreateItem}
          >
            {editingItem ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog
        open={locationDialogOpen}
        onClose={() => {
          setLocationDialogOpen(false);
          setEditingLocation(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Code"
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Name"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={locationForm.is_active}
                    onChange={(e) => setLocationForm({ ...locationForm, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setLocationDialogOpen(false);
            setEditingLocation(null);
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingLocation ? handleUpdateLocation : handleCreateLocation}
          >
            {editingLocation ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog
        open={movementDialogOpen}
        onClose={() => setMovementDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Stock Movement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Item</InputLabel>
                <Select
                  value={movementForm.item_id}
                  label="Item"
                  onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })}
                >
                  {items.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.sku} - {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Location</InputLabel>
                <Select
                  value={movementForm.location_id}
                  label="Location"
                  onChange={(e) => setMovementForm({ ...movementForm, location_id: e.target.value })}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select
                  value={movementForm.type}
                  label="Type"
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as StockMovementType })}
                >
                  <MenuItem value="receive">Receive</MenuItem>
                  <MenuItem value="issue">Issue</MenuItem>
                  <MenuItem value="adjust">Adjust</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={movementForm.qty}
                onChange={(e) => setMovementForm({ ...movementForm, qty: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Note"
                multiline
                rows={2}
                value={movementForm.note}
                onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRecordMovement}>
            Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
