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
  Alert,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Cancel, Receipt, Send, ThumbUp, ThumbDown } from "@mui/icons-material";
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
  getPurchaseOrderLines,
  getVendors,
  getInventoryItems,
  getInventoryLocations,
} from "../../../../api/logistics";
import type {
  PurchaseRequest,
  PurchaseOrder,
  PurchaseOrderLine,
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
  const [approvalMode, setApprovalMode] = useState<"approve" | "reject">("approve");
  const [selectedPr, setSelectedPr] = useState<PurchaseRequest | null>(null);
  const [cancelPoDialogOpen, setCancelPoDialogOpen] = useState(false);
  const [poToCancel, setPoToCancel] = useState<PurchaseOrder | null>(null);

  // GR dialog state - stores PO lines loaded from backend
  const [grPoLines, setGrPoLines] = useState<PurchaseOrderLine[]>([]);
  const [grPoLinesLoading, setGrPoLinesLoading] = useState(false);

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

  // ─── Data loaders ───────────────────────────────────────────

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
    } catch {
      showToast({ severity: "error", message: "Failed to load purchase requests" });
    } finally {
      setLoading(false);
    }
  }, [prsSearch, prsStatus, prsPage, prsPerPage]);

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPurchaseOrders({ limit: posPerPage, offset: posPage * posPerPage });
      setPos(result.items);
      setPosTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load purchase orders" });
    } finally {
      setLoading(false);
    }
  }, [posPage, posPerPage]);

  const loadGoodsReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGoodsReceipts({ limit: grsPerPage, offset: grsPage * grsPerPage });
      setGrs(result.items);
      setGrsTotal(result.total);
    } catch {
      showToast({ severity: "error", message: "Failed to load goods receipts" });
    } finally {
      setLoading(false);
    }
  }, [grsPage, grsPerPage]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [vendorsRes, itemsRes, locationsRes] = await Promise.all([
        getVendors({ limit: 200, offset: 0 }),
        getInventoryItems({ limit: 200, offset: 0 }),
        getInventoryLocations({ limit: 200, offset: 0 }),
      ]);
      setVendors(vendorsRes.items);
      setItems(itemsRes.items);
      setLocations(locationsRes.items);
    } catch {
      console.error("Failed to load reference data");
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

  // ─── Open GR dialog and load PO lines ───────────────────────

  const openGrDialog = async (po: PurchaseOrder) => {
    setGrForm({ purchase_order_id: po.id, location_id: "", lines: [] });
    setGrPoLines([]);
    setGrPoLinesLoading(true);
    setGrDialogOpen(true);
    try {
      const lines = await getPurchaseOrderLines(po.id);
      setGrPoLines(lines);
      // Pre-populate GR lines with remaining quantities
      setGrForm({
        purchase_order_id: po.id,
        location_id: "",
        lines: lines.map((l) => ({
          purchase_order_line_id: l.id,
          qty_received: String(Math.max(0, l.qty_ordered - l.qty_received)),
        })),
      });
    } catch {
      showToast({ severity: "error", message: "Failed to load PO lines" });
    } finally {
      setGrPoLinesLoading(false);
    }
  };

  // ─── Action handlers ─────────────────────────────────────────

  const handleCreatePR = async () => {
    const validLines = prLines.filter((l) => l.item_id && l.qty);
    if (validLines.length === 0) {
      showToast({ severity: "error", message: "Add at least one line item" });
      return;
    }
    try {
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
    } catch {
      showToast({ severity: "error", message: "Failed to create purchase request" });
    }
  };

  const handleSubmitPR = async (id: string) => {
    try {
      await submitPurchaseRequest(id);
      showToast({ severity: "success", message: "Purchase request submitted for approval" });
      loadPurchaseRequests();
    } catch {
      showToast({ severity: "error", message: "Failed to submit purchase request" });
    }
  };

  const handleApproveOrReject = async () => {
    if (!selectedPr) return;
    if (approvalMode === "reject" && !decisionNote.trim()) {
      showToast({ severity: "error", message: "A decision note is required when rejecting" });
      return;
    }
    try {
      if (approvalMode === "approve") {
        await approvePurchaseRequest(selectedPr.id, decisionNote || undefined);
        showToast({ severity: "success", message: "Purchase request approved" });
      } else {
        await rejectPurchaseRequest(selectedPr.id, decisionNote);
        showToast({ severity: "success", message: "Purchase request rejected" });
      }
      setApprovalDialogOpen(false);
      setSelectedPr(null);
      setDecisionNote("");
      loadPurchaseRequests();
    } catch {
      showToast({ severity: "error", message: `Failed to ${approvalMode} purchase request` });
    }
  };

  const handleCreatePO = async () => {
    const validLines = poForm.lines.filter((l) => l.item_id && l.qty_ordered);
    if (!poForm.vendor_id || validLines.length === 0) {
      showToast({ severity: "error", message: "Select a vendor and add at least one line item" });
      return;
    }
    try {
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
      setPoForm({ vendor_id: "", lines: [{ item_id: "", qty_ordered: "", unit_price: "" }] });
      loadPurchaseOrders();
    } catch {
      showToast({ severity: "error", message: "Failed to create purchase order" });
    }
  };

  const handleCancelPO = async () => {
    if (!poToCancel) return;
    try {
      await cancelPurchaseOrder(poToCancel.id);
      showToast({ severity: "success", message: "Purchase order cancelled" });
      setCancelPoDialogOpen(false);
      setPoToCancel(null);
      loadPurchaseOrders();
    } catch {
      showToast({ severity: "error", message: "Failed to cancel purchase order" });
    }
  };

  const handleCreateGR = async () => {
    const validLines = grForm.lines.filter((l) => l.purchase_order_line_id && l.qty_received);
    if (!grForm.purchase_order_id || !grForm.location_id || validLines.length === 0) {
      showToast({ severity: "error", message: "Select a receiving location and fill in quantities" });
      return;
    }
    try {
      await createGoodsReceipt({
        purchase_order_id: grForm.purchase_order_id,
        location_id: grForm.location_id,
        lines: validLines.map((l) => ({
          purchase_order_line_id: l.purchase_order_line_id,
          qty_received: Number(l.qty_received),
        })),
      });
      showToast({ severity: "success", message: "Goods receipt created — stock updated" });
      setGrDialogOpen(false);
      setGrForm({ purchase_order_id: "", location_id: "", lines: [] });
      setGrPoLines([]);
      loadGoodsReceipts();
      loadPurchaseOrders(); // status may have changed
    } catch {
      showToast({ severity: "error", message: "Failed to create goods receipt" });
    }
  };

  // ─── Form helpers ────────────────────────────────────────────

  const addPrLine = () => setPrLines([...prLines, { item_id: "", qty: "", note: "" }]);
  const removePrLine = (i: number) => setPrLines(prLines.filter((_, idx) => idx !== i));
  const addPoLine = () =>
    setPoForm({ ...poForm, lines: [...poForm.lines, { item_id: "", qty_ordered: "", unit_price: "" }] });
  const removePoLine = (i: number) =>
    setPoForm({ ...poForm, lines: poForm.lines.filter((_, idx) => idx !== i) });

  // ─── Lookup helpers ──────────────────────────────────────────

  const getVendorName = (id: string) => vendors.find((v) => v.id === id)?.name || "–";
  const getItemName = (id: string) => {
    const it = items.find((i) => i.id === id);
    return it ? `${it.sku} – ${it.name}` : id.substring(0, 8).toUpperCase();
  };
  const getLocationName = (id: string) => locations.find((l) => l.id === id)?.name || "–";

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Box>
      <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab label="Purchase Requests" />
        <Tab label="Purchase Orders" />
        <Tab label="Goods Receipts" />
      </Tabs>

      {/* ── Purchase Requests ── */}
      {subTab === 0 && (
        <Box>
          <ListFiltersBar
            searchValue={prsSearch}
            onSearchChange={setPrsSearch}
            searchPlaceholder="Search purchase requests…"
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
              onClick={() => { setPrLines([{ item_id: "", qty: "", note: "" }]); setPrDialogOpen(true); }}
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
                        <TableCell>Decision Note</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prs.map((pr) => (
                        <TableRow key={pr.id} hover>
                          <TableCell>
                            <Typography fontWeight={600} fontFamily="monospace">
                              {pr.id.substring(0, 8).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusChip status={pr.status} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {pr.decision_note || "–"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Date(pr.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            {pr.status === "draft" && (
                              <Tooltip title="Submit for Approval">
                                <IconButton size="small" color="primary" onClick={() => handleSubmitPR(pr.id)}>
                                  <Send fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {pr.status === "submitted" && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedPr(pr);
                                      setApprovalMode("approve");
                                      setDecisionNote("");
                                      setApprovalDialogOpen(true);
                                    }}
                                  >
                                    <ThumbUp fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedPr(pr);
                                      setApprovalMode("reject");
                                      setDecisionNote("");
                                      setApprovalDialogOpen(true);
                                    }}
                                  >
                                    <ThumbDown fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {prs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">No purchase requests found</Typography>
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

      {/* ── Purchase Orders ── */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setPoForm({ vendor_id: "", lines: [{ item_id: "", qty_ordered: "", unit_price: "" }] });
                setPoDialogOpen(true);
              }}
            >
              New Purchase Order
            </Button>
            <Button variant="outlined" onClick={loadPurchaseOrders}>Refresh</Button>
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
                      {pos.map((po) => (
                        <TableRow key={po.id} hover>
                          <TableCell>
                            <Typography fontWeight={600} fontFamily="monospace">
                              {po.id.substring(0, 8).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>{getVendorName(po.vendor_id)}</TableCell>
                          <TableCell>
                            <StatusChip status={po.status} />
                          </TableCell>
                          <TableCell>
                            {new Date(po.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            {(po.status === "open" || po.status === "partial") && (
                              <>
                                <Tooltip title="Create Goods Receipt">
                                  <IconButton size="small" color="success" onClick={() => openGrDialog(po)}>
                                    <Receipt fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel Order">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => { setPoToCancel(po); setCancelPoDialogOpen(true); }}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {pos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">No purchase orders found</Typography>
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

      {/* ── Goods Receipts ── */}
      {subTab === 2 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={loadGoodsReceipts}>Refresh</Button>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Goods receipts are created from the <strong>Purchase Orders</strong> tab by clicking the receipt icon.
            Each receipt automatically updates stock levels.
          </Alert>

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
                        <TableCell>Receiving Location</TableCell>
                        <TableCell>Received At</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grs.map((gr) => (
                        <TableRow key={gr.id} hover>
                          <TableCell>
                            <Typography fontWeight={600} fontFamily="monospace">
                              {gr.id.substring(0, 8).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontFamily="monospace" variant="body2">
                              {gr.purchase_order_id.substring(0, 8).toUpperCase()}
                            </Typography>
                          </TableCell>
                          <TableCell>{getLocationName(gr.location_id)}</TableCell>
                          <TableCell>
                            {new Date(gr.received_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {grs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                            <Typography color="text.secondary">No goods receipts found</Typography>
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

      {/* ═══════════ DIALOGS ═══════════ */}

      {/* PR Dialog */}
      <Dialog open={prDialogOpen} onClose={() => setPrDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Add the items you need to request. After creation, submit it for approval.
          </Typography>
          {prLines.map((line, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Item *</InputLabel>
                  <Select
                    value={line.item_id}
                    label="Item *"
                    onChange={(e) => {
                      const newLines = [...prLines];
                      newLines[index].item_id = e.target.value;
                      setPrLines(newLines);
                    }}
                  >
                    {items.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.sku} – {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Qty *"
                  type="number"
                  value={line.qty}
                  onChange={(e) => {
                    const newLines = [...prLines];
                    newLines[index].qty = e.target.value;
                    setPrLines(newLines);
                  }}
                  inputProps={{ min: 1 }}
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
                <IconButton size="small" onClick={() => removePrLine(index)} disabled={prLines.length === 1}>
                  <Cancel />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button size="small" onClick={addPrLine} startIcon={<Add />}>
            Add Line
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePR}>Create as Draft</Button>
        </DialogActions>
      </Dialog>

      {/* Approve / Reject Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalMode === "approve" ? "✅ Approve Purchase Request" : "❌ Reject Purchase Request"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            PR: <strong>{selectedPr?.id.substring(0, 8).toUpperCase()}</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label={approvalMode === "reject" ? "Rejection Reason (required)" : "Decision Note (optional)"}
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            required={approvalMode === "reject"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          {approvalMode === "reject" ? (
            <Button variant="contained" color="error" onClick={handleApproveOrReject}>
              Reject
            </Button>
          ) : (
            <Button variant="contained" color="success" onClick={handleApproveOrReject}>
              Approve
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* PO Dialog */}
      <Dialog open={poDialogOpen} onClose={() => setPoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Purchase Order</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
            <InputLabel>Vendor *</InputLabel>
            <Select
              value={poForm.vendor_id}
              label="Vendor *"
              onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
            >
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Line Items</Typography>
          </Divider>

          {poForm.lines.map((line, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 1.5 }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Item *</InputLabel>
                  <Select
                    value={line.item_id}
                    label="Item *"
                    onChange={(e) => {
                      const newLines = [...poForm.lines];
                      newLines[index].item_id = e.target.value;
                      setPoForm({ ...poForm, lines: newLines });
                    }}
                  >
                    {items.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.sku} – {item.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Qty *"
                  type="number"
                  value={line.qty_ordered}
                  onChange={(e) => {
                    const newLines = [...poForm.lines];
                    newLines[index].qty_ordered = e.target.value;
                    setPoForm({ ...poForm, lines: newLines });
                  }}
                  inputProps={{ min: 1 }}
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
          <Button size="small" onClick={addPoLine} startIcon={<Add />}>Add Line</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPoDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePO}>Create Purchase Order</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel PO Dialog */}
      <Dialog
        open={cancelPoDialogOpen}
        onClose={() => { setCancelPoDialogOpen(false); setPoToCancel(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancel Purchase Order</DialogTitle>
        <DialogContent>
          <Typography>
            Cancel PO{" "}
            <Typography component="span" fontWeight={700} fontFamily="monospace">
              {poToCancel?.id.substring(0, 8).toUpperCase()}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCancelPoDialogOpen(false); setPoToCancel(null); }}>Back</Button>
          <Button variant="contained" color="error" onClick={handleCancelPO}>Cancel Order</Button>
        </DialogActions>
      </Dialog>

      {/* GR Dialog — loaded with actual PO lines */}
      <Dialog open={grDialogOpen} onClose={() => setGrDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Goods Receipt</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            PO:{" "}
            <Typography component="span" fontFamily="monospace" fontWeight={700}>
              {grForm.purchase_order_id.substring(0, 8).toUpperCase()}
            </Typography>
            {" "}— Enter quantities received for each line. Stock will be automatically updated.
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Receiving Location *</InputLabel>
            <Select
              value={grForm.location_id}
              label="Receiving Location *"
              onChange={(e) => setGrForm({ ...grForm, location_id: e.target.value })}
            >
              {locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Items to Receive</Typography>
          </Divider>

          {grPoLinesLoading ? (
            <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={32} />
            </Box>
          ) : grPoLines.length === 0 ? (
            <Alert severity="warning">No line items found for this purchase order.</Alert>
          ) : (
            <>
              {/* Header row */}
              <Grid container spacing={1} sx={{ mb: 1, px: 1 }}>
                <Grid size={{ xs: 5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>ITEM</Typography>
                </Grid>
                <Grid size={{ xs: 2 }} textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>ORDERED</Typography>
                </Grid>
                <Grid size={{ xs: 2 }} textAlign="center">
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>RECEIVED</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>QTY RECEIVING NOW</Typography>
                </Grid>
              </Grid>
              {grPoLines.map((poLine, index) => {
                const grLine = grForm.lines[index];
                const remaining = poLine.qty_ordered - poLine.qty_received;
                return (
                  <Paper key={poLine.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid size={{ xs: 5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {getItemName(poLine.item_id)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 2 }} textAlign="center">
                        <Typography variant="body2">{poLine.qty_ordered}</Typography>
                      </Grid>
                      <Grid size={{ xs: 2 }} textAlign="center">
                        <Typography variant="body2" color={poLine.qty_received > 0 ? "success.main" : "text.secondary"}>
                          {poLine.qty_received}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 3 }}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label={`Max: ${remaining}`}
                          value={grLine?.qty_received || ""}
                          onChange={(e) => {
                            const newLines = [...grForm.lines];
                            if (newLines[index]) {
                              newLines[index].qty_received = e.target.value;
                            }
                            setGrForm({ ...grForm, lines: newLines });
                          }}
                          inputProps={{ min: 0, max: remaining }}
                          disabled={remaining <= 0}
                          helperText={remaining <= 0 ? "Fully received" : undefined}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                );
              })}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateGR} disabled={grPoLinesLoading}>
            Confirm Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
