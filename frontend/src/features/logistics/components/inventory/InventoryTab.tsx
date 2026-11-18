import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
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
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Add,
  Delete,
  Edit,
  SwapHoriz,
  ArrowUpward,
  ArrowDownward,
  TrendingFlat,
} from "@mui/icons-material";
import {
  getInventoryItems,
  getInventoryLocations,
  getStockOnHand,
  getStockMovements,
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
  StockMovement,
  StockMovementType,
} from "../../logisticsTypes";
import ListFiltersBar from "../shared/ListFiltersBar";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";
import { listLogisticsUoms, type LogisticsUom } from "../../logisticsSettings";

// Movement type badge colors
function MovementTypeChip({ type }: { type: StockMovementType }) {
  const config: Record<
    StockMovementType,
    { color: "success" | "error" | "info"; icon: React.ReactNode; label: string }
  > = {
    receive: { color: "success", icon: <ArrowUpward sx={{ fontSize: 14 }} />, label: "RECEIVE" },
    issue: { color: "error", icon: <ArrowDownward sx={{ fontSize: 14 }} />, label: "ISSUE" },
    adjust: { color: "info", icon: <TrendingFlat sx={{ fontSize: 14 }} />, label: "ADJUST" },
  };
  const c = config[type] || { color: "default" as const, icon: <SwapHoriz sx={{ fontSize: 14 }} />, label: type?.toUpperCase() };
  return (
    <Chip
      label={c.label}
      color={c.color}
      size="small"
      icon={c.icon as React.ReactElement}
      sx={{ fontWeight: 700, letterSpacing: 0.5 }}
    />
  );
}

function getNextInventorySku(items: InventoryItem[]) {
  const maxNumber = items.reduce((max, item) => {
    const match = item.sku.trim().match(/^SKU-?(\d+)$/i);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `SKU-${String(maxNumber + 1).padStart(4, "0")}`;
}

export default function InventoryTab() {
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Items state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [uomOptions, setUomOptions] = useState<LogisticsUom[]>([]);
  const [itemsLookup, setItemsLookup] = useState<InventoryItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [itemsSearch, setItemsSearch] = useState("");
  const [itemsStatusFilter, setItemsStatusFilter] = useState("active");

  // Locations state
  const [locationsLookup, setLocationsLookup] = useState<InventoryLocation[]>([]);
  const [locationsList, setLocationsList] = useState<InventoryLocation[]>([]);
  const [locationsSearch, setLocationsSearch] = useState("");
  const [locationsStatusFilter, setLocationsStatusFilter] = useState("active");

  // Stock on hand state
  const [stockOnHand, setStockOnHand] = useState<StockOnHandRow[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Stock movements state
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsPage, setMovementsPage] = useState(0);
  const [movementsPerPage, setMovementsPerPage] = useState(20);
  const [movementsItemFilter, setMovementsItemFilter] = useState("");
  const [movementsLocationFilter, setMovementsLocationFilter] = useState("");

  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingLocation, setEditingLocation] = useState<InventoryLocation | null>(null);
  const [skuLoading, setSkuLoading] = useState(false);

  const [deactivateItemDialogOpen, setDeactivateItemDialogOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState<InventoryItem | null>(null);
  const [deactivateLocationDialogOpen, setDeactivateLocationDialogOpen] = useState(false);
  const [locationToDeactivate, setLocationToDeactivate] = useState<InventoryLocation | null>(null);

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
        is_active: itemsStatusFilter === "" ? undefined : itemsStatusFilter === "active",
        limit: itemsPerPage,
        offset: itemsPage * itemsPerPage,
      });
      setItems(result.items);
      setItemsTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load inventory items" });
    } finally {
      setLoading(false);
    }
  }, [itemsSearch, itemsStatusFilter, itemsPage, itemsPerPage]);

  const loadItemsLookup = useCallback(async () => {
    try {
      const result = await getInventoryItems({ is_active: true, limit: 1000, offset: 0 });
      setItemsLookup(result.items);
    } catch {
      /* silent */
    }
  }, []);

  const loadLocationsLookup = useCallback(async () => {
    try {
      const result = await getInventoryLocations({ is_active: true, limit: 1000, offset: 0 });
      setLocationsLookup(result.items);
    } catch {
      /* silent */
    }
  }, []);

  const loadLocationsList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInventoryLocations({
        q: locationsSearch || undefined,
        is_active: locationsStatusFilter === "" ? undefined : locationsStatusFilter === "active",
        limit: 1000,
        offset: 0,
      });
      setLocationsList(result.items);
    } catch {
      showToast({ severity: "error", message: "Failed to load locations" });
    } finally {
      setLoading(false);
    }
  }, [locationsSearch, locationsStatusFilter]);

  const loadStockOnHand = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockOnHand({ location_id: selectedLocation || undefined });
      setStockOnHand(result);
    } catch {
      showToast({ severity: "error", message: "Failed to load stock on hand" });
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockMovements({
        item_id: movementsItemFilter || undefined,
        location_id: movementsLocationFilter || undefined,
        limit: movementsPerPage,
        offset: movementsPage * movementsPerPage,
      });
      setMovements(result.items);
      setMovementsTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load stock movements" });
    } finally {
      setLoading(false);
    }
  }, [movementsItemFilter, movementsLocationFilter, movementsPage, movementsPerPage]);

  useEffect(() => {
    if (subTab === 0) loadItems();
    else if (subTab === 1) loadStockOnHand();
    else if (subTab === 2) loadMovements();
    else if (subTab === 3) loadLocationsList();
  }, [subTab, loadItems, loadStockOnHand, loadMovements, loadLocationsList]);

  useEffect(() => {
    loadLocationsLookup();
    loadItemsLookup();
  }, [loadLocationsLookup, loadItemsLookup]);

  useEffect(() => {
    setUomOptions(listLogisticsUoms(true));
  }, [itemDialogOpen]);

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
      loadItemsLookup();
    } catch {
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
      loadItemsLookup();
    } catch {
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
      loadLocationsLookup();
      loadLocationsList();
    } catch {
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
      loadLocationsLookup();
      loadLocationsList();
    } catch {
      showToast({ severity: "error", message: "Failed to update location" });
    }
  };

  const handleRecordMovement = async () => {
    if (!movementForm.item_id || !movementForm.location_id || !movementForm.qty) {
      showToast({ severity: "error", message: "Please fill in all required fields" });
      return;
    }
    try {
      await createStockMovement({
        item_id: movementForm.item_id,
        location_id: movementForm.location_id,
        type: movementForm.type,
        qty: Number(movementForm.qty),
        note: movementForm.note || undefined,
      });
      showToast({ severity: "success", message: "Stock movement recorded successfully" });
      setMovementDialogOpen(false);
      resetMovementForm();
      // Refresh current tab data
      if (subTab === 1) loadStockOnHand();
      else if (subTab === 2) loadMovements();
    } catch {
      showToast({ severity: "error", message: "Failed to record movement" });
    }
  };

  const resetItemForm = () => setItemForm({ sku: "", name: "", uom: "", reorder_level: "", is_active: true });
  const resetLocationForm = () => setLocationForm({ code: "", name: "", is_active: true });
  const resetMovementForm = () => setMovementForm({ item_id: "", location_id: "", type: "receive", qty: "", note: "" });

  const openCreateItem = async () => {
    setEditingItem(null);
    setItemForm({
      sku: getNextInventorySku([...itemsLookup, ...items]),
      name: "",
      uom: "",
      reorder_level: "",
      is_active: true,
    });
    setItemDialogOpen(true);
    setSkuLoading(true);

    try {
      const result = await getInventoryItems({ limit: 1000, offset: 0 });
      setItemForm((prev) => ({
        ...prev,
        sku: getNextInventorySku(result.items),
      }));
    } catch {
      showToast({ severity: "error", message: "Failed to generate next SKU" });
    } finally {
      setSkuLoading(false);
    }
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
    setLocationForm({ code: location.code, name: location.name, is_active: location.is_active });
    setLocationDialogOpen(true);
  };

  const openDeactivateItem = (item: InventoryItem) => {
    setItemToDeactivate(item);
    setDeactivateItemDialogOpen(true);
  };

  const handleDeactivateItem = async () => {
    if (!itemToDeactivate) return;
    try {
      await updateInventoryItem(itemToDeactivate.id, { is_active: false });
      showToast({ severity: "success", message: "Item deactivated" });
      setDeactivateItemDialogOpen(false);
      setItemToDeactivate(null);
      loadItems();
      loadItemsLookup();
    } catch {
      showToast({ severity: "error", message: "Failed to deactivate item" });
    }
  };

  const openDeactivateLocation = (location: InventoryLocation) => {
    setLocationToDeactivate(location);
    setDeactivateLocationDialogOpen(true);
  };

  const handleDeactivateLocation = async () => {
    if (!locationToDeactivate) return;
    try {
      await updateInventoryLocation(locationToDeactivate.id, { is_active: false });
      showToast({ severity: "success", message: "Location deactivated" });
      setDeactivateLocationDialogOpen(false);
      setLocationToDeactivate(null);
      loadLocationsLookup();
      loadLocationsList();
    } catch {
      showToast({ severity: "error", message: "Failed to deactivate location" });
    }
  };

  // Helper lookup functions for movements
  const getItemName = (itemId: string) => {
    const item = itemsLookup.find((i) => i.id === itemId);
    return item ? `${item.sku} – ${item.name}` : itemId.substring(0, 8).toUpperCase();
  };
  const getLocationName = (locationId: string) => {
    const loc = locationsLookup.find((l) => l.id === locationId);
    return loc ? loc.name : locationId.substring(0, 8).toUpperCase();
  };

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Items" />
        <Tab label="Stock on Hand" />
        <Tab label="Stock Movements" />
        <Tab label="Locations" />
      </Tabs>

      {/* ── Items Tab ── */}
      {subTab === 0 && (
        <Box>
          <ListFiltersBar
            searchValue={itemsSearch}
            onSearchChange={setItemsSearch}
            searchPlaceholder="Search items by SKU or name…"
            statusValue={itemsStatusFilter}
            onStatusChange={(value) => { setItemsStatusFilter(value); setItemsPage(0); }}
            statusOptions={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            onRefresh={loadItems}
            loading={loading}
          />
          <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateItem}
            >
              Add Item
            </Button>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => { resetMovementForm(); setMovementDialogOpen(true); }}
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
                          <TableCell>{item.reorder_level ?? "–"}</TableCell>
                          <TableCell>
                            <StatusChip status={item.is_active ? "active" : "inactive"} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => openEditItem(item)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deactivate">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => openDeactivateItem(item)}
                                  disabled={!item.is_active}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">No inventory items found</Typography>
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

      {/* ── Stock on Hand Tab ── */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Filter by Location</InputLabel>
              <Select
                value={selectedLocation}
                label="Filter by Location"
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locationsLookup.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={loadStockOnHand}>Refresh</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<SwapHoriz />}
              onClick={() => { resetMovementForm(); setMovementDialogOpen(true); }}
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
                          <Typography
                            fontWeight={700}
                            color={row.qty_on_hand <= 0 ? "error.main" : "success.main"}
                          >
                            {row.qty_on_hand}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {stockOnHand.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">No stock records found</Typography>
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

      {/* ── Stock Movements Tab ── */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Filter by Item</InputLabel>
              <Select
                value={movementsItemFilter}
                label="Filter by Item"
                onChange={(e) => { setMovementsItemFilter(e.target.value); setMovementsPage(0); }}
              >
                <MenuItem value="">All Items</MenuItem>
                {itemsLookup.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.sku} – {item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Location</InputLabel>
              <Select
                value={movementsLocationFilter}
                label="Filter by Location"
                onChange={(e) => { setMovementsLocationFilter(e.target.value); setMovementsPage(0); }}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locationsLookup.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={loadMovements}>Refresh</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<SwapHoriz />}
              onClick={() => { resetMovementForm(); setMovementDialogOpen(true); }}
            >
              Record Movement
            </Button>
          </Box>

          {movements.length === 0 && !loading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No stock movements recorded yet. Use "Record Movement" to add your first transaction.
            </Alert>
          )}

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
                        <TableCell>Type</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell>Ref</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movements.map((m) => (
                        <TableRow key={m.id} hover>
                          <TableCell>
                            <MovementTypeChip type={m.type} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {getItemName(m.item_id)}
                            </Typography>
                          </TableCell>
                          <TableCell>{getLocationName(m.location_id)}</TableCell>
                          <TableCell align="right">
                            <Typography
                              fontWeight={700}
                              color={
                                m.type === "receive"
                                  ? "success.main"
                                  : m.type === "issue"
                                  ? "error.main"
                                  : "info.main"
                              }
                            >
                              {m.type === "issue" ? "-" : "+"}
                              {Math.abs(m.qty)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {m.ref_type ? (
                              <Chip
                                label={m.ref_type.toUpperCase()}
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              "–"
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {m.note || "–"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(m.created_at).toLocaleString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {movements.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">No movements found</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={movementsTotal}
                  page={movementsPage}
                  onPageChange={(_, p) => setMovementsPage(p)}
                  rowsPerPage={movementsPerPage}
                  onRowsPerPageChange={(e) => setMovementsPerPage(Number(e.target.value))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* ── Locations Tab ── */}
      {subTab === 3 && (
        <Box>
          <ListFiltersBar
            searchValue={locationsSearch}
            onSearchChange={setLocationsSearch}
            searchPlaceholder="Search locations by code or name…"
            statusValue={locationsStatusFilter}
            onStatusChange={setLocationsStatusFilter}
            statusOptions={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            onRefresh={loadLocationsList}
            loading={loading}
          />
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => { resetLocationForm(); setEditingLocation(null); setLocationDialogOpen(true); }}
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
                    {locationsList.map((loc) => (
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
                          <Tooltip title="Deactivate">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => openDeactivateLocation(loc)}
                                disabled={!loc.is_active}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {locationsList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                          <Typography color="text.secondary">No locations found</Typography>
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

      {/* ═══════════════════════════ DIALOGS ═══════════════════════════ */}

      {/* Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => { setItemDialogOpen(false); setEditingItem(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="SKU"
                value={skuLoading && !editingItem ? "Generating..." : itemForm.sku}
                InputProps={{ readOnly: true }}
                required
                helperText={editingItem ? "SKU cannot be changed" : "Auto-generated from the last SKU"}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Unit of Measure (UoM)</InputLabel>
                <Select
                  value={itemForm.uom}
                  label="Unit of Measure (UoM)"
                  onChange={(e) => setItemForm({ ...itemForm, uom: e.target.value })}
                >
                  <MenuItem value="">Select UoM</MenuItem>
                  {uomOptions.map((uom) => (
                    <MenuItem key={uom.id} value={uom.code}>
                      {uom.code} - {uom.name}
                      {uom.examples ? ` (${uom.examples})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                helperText="Alert when stock falls below this quantity"
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
          <Button onClick={() => { setItemDialogOpen(false); setEditingItem(null); }}>Cancel</Button>
          <Button variant="contained" onClick={editingItem ? handleUpdateItem : handleCreateItem}>
            {editingItem ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog
        open={locationDialogOpen}
        onClose={() => { setLocationDialogOpen(false); setEditingLocation(null); }}
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
                placeholder="e.g. MAIN-STORE, LAB-A"
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
          <Button onClick={() => { setLocationDialogOpen(false); setEditingLocation(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={editingLocation ? handleUpdateLocation : handleCreateLocation}
          >
            {editingLocation ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stock Movement Dialog */}
      <Dialog open={movementDialogOpen} onClose={() => setMovementDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Stock Movement</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            <strong>Receive</strong>: adds stock &nbsp;|&nbsp; <strong>Issue</strong>: removes stock &nbsp;|&nbsp; <strong>Adjust</strong>: corrections
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Item</InputLabel>
                <Select
                  value={movementForm.item_id}
                  label="Item"
                  onChange={(e) => setMovementForm({ ...movementForm, item_id: e.target.value })}
                >
                  {itemsLookup.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.sku} – {item.name} ({item.uom})
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
                  {locationsLookup.map((loc) => (
                    <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Movement Type</InputLabel>
                <Select
                  value={movementForm.type}
                  label="Movement Type"
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as StockMovementType })}
                >
                  <MenuItem value="receive">📥 Receive (add stock)</MenuItem>
                  <MenuItem value="issue">📤 Issue (remove stock)</MenuItem>
                  <MenuItem value="adjust">🔄 Adjust (correction)</MenuItem>
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
                inputProps={{ min: 1 }}
                helperText="Always enter a positive number"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Note / Reference"
                multiline
                rows={2}
                value={movementForm.note}
                onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
                placeholder="Optional reason, reference number, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRecordMovement}>
            Record Movement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Item Dialog */}
      <Dialog
        open={deactivateItemDialogOpen}
        onClose={() => { setDeactivateItemDialogOpen(false); setItemToDeactivate(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate Item</DialogTitle>
        <DialogContent>
          <Typography>
            Deactivate{" "}
            <Typography component="span" fontWeight={700}>
              {itemToDeactivate?.sku} – {itemToDeactivate?.name}
            </Typography>
            ? It will be hidden from active selections.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeactivateItemDialogOpen(false); setItemToDeactivate(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeactivateItem}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Location Dialog */}
      <Dialog
        open={deactivateLocationDialogOpen}
        onClose={() => { setDeactivateLocationDialogOpen(false); setLocationToDeactivate(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Deactivate Location</DialogTitle>
        <DialogContent>
          <Typography>
            Deactivate{" "}
            <Typography component="span" fontWeight={700}>
              {locationToDeactivate?.code} – {locationToDeactivate?.name}
            </Typography>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeactivateLocationDialogOpen(false); setLocationToDeactivate(null); }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeactivateLocation}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
