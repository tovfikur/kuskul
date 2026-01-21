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
  IconButton,
  Tooltip,

} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Edit, CheckCircle, Cancel, Receipt } from "@mui/icons-material";
import {
  getPurchaseRequests,
  createPurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  rejectPurchaseRequest,
  getPurchaseOrders,
  createPurchaseOrder,
  cancelPurchaseOrder,
  getGoodsReceipts,
  createGoodsReceipt,
  getVendors,
  getInventoryItems,
  getInventoryLocations,
} from "../../../../api/logistics";
import type {
  PurchaseRequest,
  PurchaseOrder,
  GoodsReceipt,
  Vendor,
  InventoryItem,
  InventoryLocation,
} from "../../logisticsTypes";
import ListFiltersBar from "../shared/ListFiltersBar";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";

export default function ProcurementTab() {
  const [subTab, setSubTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Purchase Requests state
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [prsTotal, setPrsTotal] = useState(0);
  const [prsPage, setPrsPage] = useState(0);
  const [prsPerPage, setPrsPerPage] = useState(20);
  const [prsSearch, setPrsSearch] = useState("");
  const [prsStatus, setPrsStatus] = useState("");

  // Purchase Orders state
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [posTotal, setPosTotal] = useState(0);
  const [posPage, setPosPage] = useState(0);
  const [posPerPage, setPosPerPage] = useState(20);

  // Goods Receipts state
  const [grs, setGrs] = useState<GoodsReceipt[]>([]);
  const [grsTotal, setGrsTotal] = useState(0);
  const [grsPage, setGrsPage] = useState(0);
  const [grsPerPage, setGrsPerPage] = useState(20);

  // Reference data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);

  // Dialog states
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [grDialogOpen, setGrDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);


  // Form states
  const [prLines, setPrLines] = useState<{ item_id: string; qty: string; note: string }[]>([
    { item_id: "", qty: "", note: "" },
  ]);

  const [poForm, setPoForm] = useState({
    vendor_id: "",
    lines: [{ item_id: "", qty_ordered: "", unit_price: "" }],
  });

  const [grForm, setGrForm] = useState({
    purchase_order_id: "",
    location_id: "",
    lines: [] as { purchase_order_line_id: string; qty_received: string }[],
  });

  const [decisionNote, setDecisionNote] = useState("");

  const loadPurchaseRequests = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPurchaseRequests({
        q: prsSearch || undefined,
        status: prsStatus || undefined,
        limit: prsPerPage,
        offset: prsPage * prsPerPage,
      });
      setPrs(result.items);
      setPrsTotal(result.total);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load purchase requests" });
    } finally {
      setLoading(false);
    }
  }, [prsSearch, prsStatus, prsPage, prsPerPage]);

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPurchaseOrders({
        limit: posPerPage,
        offset: posPage * posPerPage,
      });
      setPos(result.items);
      setPosTotal(result.total);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load purchase orders" });
    } finally {
      setLoading(false);
    }
  }, [posPage, posPerPage]);

  const loadGoodsReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGoodsReceipts({
        limit: grsPerPage,
        offset: grsPage * grsPerPage,
      });
      setGrs(result.items);
      setGrsTotal(result.total);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load goods receipts" });
    } finally {
      setLoading(false);
    }
  }, [grsPage, grsPerPage]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [vendorsRes, itemsRes, locationsRes] = await Promise.all([
        getVendors({ limit: 100, offset: 0 }),
        getInventoryItems({ limit: 100, offset: 0 }),
        getInventoryLocations({ limit: 100, offset: 0 }),
      ]);
      setVendors(vendorsRes.items);
      setItems(itemsRes.items);
      setLocations(locationsRes.items);
    } catch (error) {
      console.error("Failed to load reference data", error);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    if (subTab === 0) loadPurchaseRequests();
    else if (subTab === 1) loadPurchaseOrders();
    else if (subTab === 2) loadGoodsReceipts();
  }, [subTab, loadPurchaseRequests, loadPurchaseOrders, loadGoodsReceipts]);

  const handleCreatePR = async () => {
    try {
      const validLines = prLines.filter((l) => l.item_id && l.qty);
      if (validLines.length === 0) {
        showToast({ severity: "error", message: "Add at least one line item" });
        return;
      }
      await createPurchaseRequest({
        lines: validLines.map((l) => ({
          item_id: l.item_id,
          qty: Number(l.qty),
          note: l.note || undefined,
        })),
      });
      showToast({ severity: "success", message: "Purchase request created" });
      setPrDialogOpen(false);
      setPrLines([{ item_id: "", qty: "", note: "" }]);
      loadPurchaseRequests();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to create purchase request" });
    }
  };

  const handleSubmitPR = async (id: string) => {
    try {
      await submitPurchaseRequest(id);
      showToast({ severity: "success", message: "Purchase request submitted" });
      loadPurchaseRequests();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to submit purchase request" });
    }
  };

  const handleApprovePR = async () => {
    if (!selectedPr) return;
    try {
      await approvePurchaseRequest(selectedPr.id, decisionNote);
      showToast({ severity: "success", message: "Purchase request approved" });
      setApprovalDialogOpen(false);
      setSelectedPr(null);
      setDecisionNote("");
      loadPurchaseRequests();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to approve purchase request" });
    }
  };

  const handleRejectPR = async () => {
    if (!selectedPr || !decisionNote.trim()) {
      showToast({ severity: "error", message: "Decision note is required for rejection" });
      return;
    }
    try {
      await rejectPurchaseRequest(selectedPr.id, decisionNote);
      showToast({ severity: "success", message: "Purchase request rejected" });
      setApprovalDialogOpen(false);
      setSelectedPr(null);
      setDecisionNote("");
      loadPurchaseRequests();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to reject purchase request" });
    }
  };

  const handleCreatePO = async () => {
    try {
      const validLines = poForm.lines.filter((l) => l.item_id && l.qty_ordered);
      if (!poForm.vendor_id || validLines.length === 0) {
        showToast({ severity: "error", message: "Select vendor and add line items" });
        return;
      }
      await createPurchaseOrder({
        vendor_id: poForm.vendor_id,
        lines: validLines.map((l) => ({
          item_id: l.item_id,
          qty_ordered: Number(l.qty_ordered),
          unit_price: l.unit_price ? Number(l.unit_price) : undefined,
        })),
      });
      showToast({ severity: "success", message: "Purchase order created" });
      setPoDialogOpen(false);
      setPoForm({
        vendor_id: "",
        lines: [{ item_id: "", qty_ordered: "", unit_price: "" }],
      });
      loadPurchaseOrders();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to create purchase order" });
    }
  };

  const handleCancelPO = async (id: string) => {
    try {
      await cancelPurchaseOrder(id);
      showToast({ severity: "success", message: "Purchase order cancelled" });
      loadPurchaseOrders();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to cancel purchase order" });
    }
  };

  const handleCreateGR = async () => {
    try {
      const validLines = grForm.lines.filter((l) => l.purchase_order_line_id && l.qty_received);
      if (!grForm.purchase_order_id || !grForm.location_id || validLines.length === 0) {
        showToast({ severity: "error", message: "Complete all required fields" });
        return;
      }
      await createGoodsReceipt({
        purchase_order_id: grForm.purchase_order_id,
        location_id: grForm.location_id,
        lines: validLines.map((l) => ({
          purchase_order_line_id: l.purchase_order_line_id,
          qty_received: Number(l.qty_received),
        })),
      });
      showToast({ severity: "success", message: "Goods receipt created" });
      setGrDialogOpen(false);
      setGrForm({
        purchase_order_id: "",
        location_id: "",
        lines: [],
      });
      loadGoodsReceipts();
    } catch (error) {
      showToast({ severity: "error", message: "Failed to create goods receipt" });
    }
  };

  const addPrLine = () => {
    setPrLines([...prLines, { item_id: "", qty: "", note: "" }]);
  };

  const removePrLine = (index: number) => {
    setPrLines(prLines.filter((_, i) => i !== index));
  };

  const addPoLine = () => {
    setPoForm({
      ...poForm,
      lines: [...poForm.lines, { item_id: "", qty_ordered: "", unit_price: "" }],
    });
  };

  const removePoLine = (index: number) => {
    setPoForm({
      ...poForm,
      lines: poForm.lines.filter((_, i) => i !== index),
    });
  };

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Purchase Requests" />
        <Tab label="Purchase Orders" />
        <Tab label="Goods Receipts" />
      </Tabs>

      {/* Purchase Requests Tab */}
      {subTab === 0 && (
        <Box>
          <ListFiltersBar
            searchValue={prsSearch}
            onSearchChange={setPrsSearch}
            searchPlaceholder="Search purchase requests..."
            statusValue={prsStatus}
            onStatusChange={setPrsStatus}
            statusOptions={[
              { value: "draft", label: "Draft" },
              { value: "submitted", label: "Submitted" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            onRefresh={loadPurchaseRequests}
            loading={loading}
          />

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setPrLines([{ item_id: "", qty: "", note: "" }]);
                setPrDialogOpen(true);
              }}
            >
              New Purchase Request
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
                        <TableCell>PR No.</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prs.map((pr) => (
                        <TableRow key={pr.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>
                              {pr.id.substring(0, 8).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={pr.status} />
                          </TableCell>
                          <TableCell>
                            {new Date(pr.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            {pr.status === "draft" && (
                              <Tooltip title="Submit">
                                <IconButton
                                  size="small"
                                  onClick={() => handleSubmitPR(pr.id)}
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {pr.status === "submitted" && (
                              <Tooltip title="Approve/Reject">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedPr(pr);
                                    setApprovalDialogOpen(true);
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {prs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">
                              No purchase requests found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={prsTotal}
                  page={prsPage}
                  onPageChange={(_, p) => setPrsPage(p)}
                  rowsPerPage={prsPerPage}
                  onRowsPerPageChange={(e) => setPrsPerPage(Number(e.target.value))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* Purchase Orders Tab */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setPoForm({
                  vendor_id: "",
                  lines: [{ item_id: "", qty_ordered: "", unit_price: "" }],
                });
                setPoDialogOpen(true);
              }}
            >
              New Purchase Order
            </Button>
            <Button variant="outlined" onClick={loadPurchaseOrders}>
              Refresh
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
                        <TableCell>PO No.</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pos.map((po) => {
                        const vendor = vendors.find((v) => v.id === po.vendor_id);
                        return (
                          <TableRow key={po.id} hover>
                            <TableCell>
                              <Typography fontWeight={600}>
                                {po.id.substring(0, 8).toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell>{vendor?.name || "-"}</TableCell>
                            <TableCell>
                              <StatusChip status={po.status} />
                            </TableCell>
                            <TableCell>
                              {new Date(po.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">
                              {po.status === "open" && (
                                <>
                                  <Tooltip title="Create Receipt">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setGrForm({
                                          purchase_order_id: po.id,
                                          location_id: "",
                                          lines: [],
                                        });
                                        setGrDialogOpen(true);
                                      }}
                                    >
                                      <Receipt fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Cancel">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleCancelPO(po.id)}
                                    >
                                      <Cancel fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">
                              No purchase orders found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={posTotal}
                  page={posPage}
                  onPageChange={(_, p) => setPosPage(p)}
                  rowsPerPage={posPerPage}
                  onRowsPerPageChange={(e) => setPosPerPage(Number(e.target.value))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* Goods Receipts Tab */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={loadGoodsReceipts}>
              Refresh
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
                        <TableCell>GR No.</TableCell>
                        <TableCell>PO No.</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Received At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grs.map((gr) => {
                        const location = locations.find((l) => l.id === gr.location_id);
                        return (
                          <TableRow key={gr.id} hover>
                            <TableCell>
                              <Typography fontWeight={600}>
                                {gr.id.substring(0, 8).toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {gr.purchase_order_id.substring(0, 8).toUpperCase()}
                            </TableCell>
                            <TableCell>{location?.name || "-"}</TableCell>
                            <TableCell>
                              {new Date(gr.received_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {grs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">
                              No goods receipts found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={grsTotal}
                  page={grsPage}
                  onPageChange={(_, p) => setGrsPage(p)}
                  rowsPerPage={grsPerPage}
                  onRowsPerPageChange={(e) => setGrsPerPage(Number(e.target.value))}
                  rowsPerPageOptions={[10, 20, 50]}
                />
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* PR Dialog */}
      <Dialog open={prDialogOpen} onClose={() => setPrDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {prLines.map((line, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Item</InputLabel>
                    <Select
                      value={line.item_id}
                      label="Item"
                      onChange={(e) => {
                        const newLines = [...prLines];
                        newLines[index].item_id = e.target.value;
                        setPrLines(newLines);
                      }}
                    >
                      {items.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.sku} - {item.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Qty"
                    type="number"
                    value={line.qty}
                    onChange={(e) => {
                      const newLines = [...prLines];
                      newLines[index].qty = e.target.value;
                      setPrLines(newLines);
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Note"
                    value={line.note}
                    onChange={(e) => {
                      const newLines = [...prLines];
                      newLines[index].note = e.target.value;
                      setPrLines(newLines);
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => removePrLine(index)}
                    disabled={prLines.length === 1}
                  >
                    <Cancel />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button size="small" onClick={addPrLine} startIcon={<Add />}>
              Add Line
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePR}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Approve/Reject Purchase Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Decision Note"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleRejectPR}>
            Reject
          </Button>
          <Button variant="contained" onClick={handleApprovePR}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* PO Dialog */}
      <Dialog open={poDialogOpen} onClose={() => setPoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Order</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <InputLabel>Vendor</InputLabel>
            <Select
              value={poForm.vendor_id}
              label="Vendor"
              onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
            >
              {vendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {poForm.lines.map((line, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Item</InputLabel>
                  <Select
                    value={line.item_id}
                    label="Item"
                    onChange={(e) => {
                      const newLines = [...poForm.lines];
                      newLines[index].item_id = e.target.value;
                      setPoForm({ ...poForm, lines: newLines });
                    }}
                  >
                    {items.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.sku} - {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Qty"
                  type="number"
                  value={line.qty_ordered}
                  onChange={(e) => {
                    const newLines = [...poForm.lines];
                    newLines[index].qty_ordered = e.target.value;
                    setPoForm({ ...poForm, lines: newLines });
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Unit Price"
                  type="number"
                  value={line.unit_price}
                  onChange={(e) => {
                    const newLines = [...poForm.lines];
                    newLines[index].unit_price = e.target.value;
                    setPoForm({ ...poForm, lines: newLines });
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => removePoLine(index)}
                  disabled={poForm.lines.length === 1}
                >
                  <Cancel />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button size="small" onClick={addPoLine} startIcon={<Add />}>
            Add Line
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePO}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* GR Dialog */}
      <Dialog open={grDialogOpen} onClose={() => setGrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Goods Receipt</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Receiving Location</InputLabel>
            <Select
              value={grForm.location_id}
              label="Receiving Location"
              onChange={(e) => setGrForm({ ...grForm, location_id: e.target.value })}
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: Line items will be loaded from the selected purchase order.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateGR}>
            Create Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
