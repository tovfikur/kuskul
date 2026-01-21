import { useState, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Assessment,
  Inventory,
  SwapHoriz,
  ShoppingCart,
  Business,
  Build,
  Download,
} from "@mui/icons-material";
import {
  getStockOnHandReport,
  getMovementsReport,
  getOpenOrdersReport,
  getAssetRegisterReport,
  getMaintenanceBacklogReport,
  exportReportCsv,
  getInventoryLocations,
} from "../../../../api/logistics";
import type {
  StockOnHandRow,
  InventoryLocation,
} from "../../logisticsTypes";
import { showToast } from "../../../../app/toast";

type ReportType =
  | "stock_on_hand"
  | "movements"
  | "open_orders"
  | "asset_register"
  | "maintenance_backlog"
  | null;

const reportCards = [
  {
    id: "stock_on_hand" as const,
    title: "Stock on Hand",
    description: "Current inventory levels by location",
    icon: <Inventory sx={{ fontSize: 48 }} />,
    color: "#1976d2",
  },
  {
    id: "movements" as const,
    title: "Stock Movements",
    description: "History of inventory transactions",
    icon: <SwapHoriz sx={{ fontSize: 48 }} />,
    color: "#9c27b0",
  },
  {
    id: "open_orders" as const,
    title: "Open Purchase Orders",
    description: "Pending and partial orders",
    icon: <ShoppingCart sx={{ fontSize: 48 }} />,
    color: "#f57c00",
  },
  {
    id: "asset_register" as const,
    title: "Asset Register",
    description: "Complete list of all assets",
    icon: <Business sx={{ fontSize: 48 }} />,
    color: "#388e3c",
  },
  {
    id: "maintenance_backlog" as const,
    title: "Maintenance Backlog",
    description: "Open and in-progress tickets",
    icon: <Build sx={{ fontSize: 48 }} />,
    color: "#d32f2f",
  },
];

export default function ReportsTab() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Filters
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadLocations = useCallback(async () => {
    try {
      const result = await getInventoryLocations({ limit: 100, offset: 0 });
      setLocations(result.items);
    } catch (error) {
      console.error("Failed to load locations", error);
    }
  }, []);

  const loadReport = async (type: ReportType) => {
    if (!type) return;
    setLoading(true);
    setReportData(null);
    try {
      let data;
      switch (type) {
        case "stock_on_hand":
          data = await getStockOnHandReport({
            location_id: selectedLocation || undefined,
          });
          break;
        case "movements":
          data = await getMovementsReport({
            from: fromDate || undefined,
            to: toDate || undefined,
            location_id: selectedLocation || undefined,
          });
          break;
        case "open_orders":
          data = await getOpenOrdersReport();
          break;
        case "asset_register":
          data = await getAssetRegisterReport();
          break;
        case "maintenance_backlog":
          data = await getMaintenanceBacklogReport();
          break;
      }
      setReportData(data);
    } catch (error) {
      showToast({ severity: "error", message: "Failed to load report" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (type: ReportType) => {
    setSelectedReport(type);
    if (type === "stock_on_hand" || type === "movements") {
      await loadLocations();
    }
    await loadReport(type);
  };

  const handleExportCsv = async () => {
    if (!selectedReport) return;
    try {
      const reportTypeMap: Record<string, string> = {
        stock_on_hand: "stock-on-hand",
        movements: "movements",
        open_orders: "open-orders",
        asset_register: "asset-register",
        maintenance_backlog: "maintenance-backlog",
      };

      const params: Record<string, string> = {};
      if (selectedLocation) params.location_id = selectedLocation;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const blob = await exportReportCsv(
        reportTypeMap[selectedReport] as any,
        Object.keys(params).length > 0 ? params : undefined,
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReport}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast({ severity: "success", message: "Report exported successfully" });
    } catch (error) {
      showToast({ severity: "error", message: "Failed to export report" });
    }
  };

  if (!selectedReport) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Select a Report
        </Typography>
        <Grid container spacing={3}>
          {reportCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.id}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleSelectReport(card.id)}
              >
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <Box sx={{ color: card.color, mb: 2 }}>{card.icon}</Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                  <Button size="small" startIcon={<Assessment />}>
                    View Report
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const currentCard = reportCards.find((c) => c.id === selectedReport);

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Button variant="outlined" onClick={() => setSelectedReport(null)}>
          ← Back to Reports
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          {currentCard?.title}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={handleExportCsv}
          disabled={loading || !reportData}
        >
          Export CSV
        </Button>
      </Box>

      {/* Filters */}
      {(selectedReport === "stock_on_hand" || selectedReport === "movements") && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocation}
                  label="Location"
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
            </Grid>
            {selectedReport === "movements" && (
              <>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12, sm: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => loadReport(selectedReport)}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Report Content */}
      <Paper sx={{ borderRadius: 3 }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : reportData ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {selectedReport === "stock_on_hand" && (
                    <>
                      <TableCell>SKU</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>UoM</TableCell>
                      <TableCell align="right">Qty on Hand</TableCell>
                    </>
                  )}
                  {selectedReport === "movements" && (
                    <>
                      <TableCell>Item</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Date</TableCell>
                    </>
                  )}
                  {selectedReport === "open_orders" && (
                    <>
                      <TableCell>PO No.</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Total Items</TableCell>
                      <TableCell>Created</TableCell>
                    </>
                  )}
                  {selectedReport === "asset_register" && (
                    <>
                      <TableCell>Tag</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                    </>
                  )}
                  {selectedReport === "maintenance_backlog" && (
                    <>
                      <TableCell>Ticket ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Asset Tag</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedReport === "stock_on_hand" &&
                  (reportData as StockOnHandRow[]).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.item_name}</TableCell>
                      <TableCell>{row.location_name}</TableCell>
                      <TableCell>{row.uom}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={700}>{row.qty_on_hand}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                {selectedReport === "movements" &&
                  reportData.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{row.item_name}</TableCell>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.location_name}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.type}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{row.qty}</TableCell>
                      <TableCell>
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}

                {selectedReport === "open_orders" &&
                  reportData.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{row.po_id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>{row.vendor_name}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.status}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.total_items}</TableCell>
                      <TableCell>
                        {new Date(row.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}

                {selectedReport === "asset_register" &&
                  reportData.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{row.tag}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.status}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}

                {selectedReport === "maintenance_backlog" &&
                  reportData.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{row.ticket_id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{row.asset_tag || "-"}</TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.priority}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            textTransform: "uppercase",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {row.status}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {row.cost ? `$${row.cost.toFixed(2)}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                {reportData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} sx={{ textAlign: "center", py: 4 }}>
                      <Typography color="text.secondary">
                        No data available for this report
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Click "Apply" to load the report
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
