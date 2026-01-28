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
  Chip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { Add, Delete, Edit } from "@mui/icons-material";
import {
  getMaintenanceTickets,
  createMaintenanceTicket,
  updateMaintenanceTicket,
} from "../../../../api/logistics";
import type {
  MaintenanceTicket,
  TicketPriority,
  TicketStatus,
} from "../../logisticsTypes";
import StatusChip from "../shared/StatusChip";
import { showToast } from "../../../../app/toast";

export default function MaintenanceTab() {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(
    null,
  );

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [ticketToClose, setTicketToClose] = useState<MaintenanceTicket | null>(
    null,
  );

  const [form, setForm] = useState({
    asset_id: "",
    title: "",
    description: "",
    priority: "medium" as TicketPriority,
    status: "open" as TicketStatus,
    assigned_to_user_id: "",
    cost: "",
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaintenanceTickets({
        status: statusFilter as TicketStatus | undefined,
        priority: priorityFilter as TicketPriority | undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      setTickets(result.items);
      setTotal(result.total);
    } catch {
      showToast({
        severity: "error",
        message: "Failed to load maintenance tickets",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, page, rowsPerPage]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async () => {
    try {
      await createMaintenanceTicket({
        asset_id: form.asset_id || undefined,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        assigned_to_user_id: form.assigned_to_user_id || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
      });
      showToast({ severity: "success", message: "Maintenance ticket created" });
      setDialogOpen(false);
      resetForm();
      loadTickets();
    } catch {
      showToast({ severity: "error", message: "Failed to create ticket" });
    }
  };

  const handleUpdate = async () => {
    if (!editingTicket) return;
    try {
      await updateMaintenanceTicket(editingTicket.id, {
        asset_id: form.asset_id || undefined,
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        status: form.status,
        assigned_to_user_id: form.assigned_to_user_id || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
      });
      showToast({ severity: "success", message: "Maintenance ticket updated" });
      setDialogOpen(false);
      setEditingTicket(null);
      resetForm();
      loadTickets();
    } catch {
      showToast({ severity: "error", message: "Failed to update ticket" });
    }
  };

  const resetForm = () => {
    setForm({
      asset_id: "",
      title: "",
      description: "",
      priority: "medium",
      status: "open",
      assigned_to_user_id: "",
      cost: "",
    });
  };

  const openEdit = (ticket: MaintenanceTicket) => {
    setEditingTicket(ticket);
    setForm({
      asset_id: ticket.asset_id || "",
      title: ticket.title,
      description: ticket.description || "",
      priority: ticket.priority,
      status: ticket.status,
      assigned_to_user_id: ticket.assigned_to_user_id || "",
      cost: ticket.cost?.toString() || "",
    });
    setDialogOpen(true);
  };

  const openClose = (ticket: MaintenanceTicket) => {
    setTicketToClose(ticket);
    setCloseDialogOpen(true);
  };

  const handleClose = async () => {
    if (!ticketToClose) return;
    try {
      await updateMaintenanceTicket(ticketToClose.id, { status: "done" });
      showToast({ severity: "success", message: "Ticket marked as done" });
      setCloseDialogOpen(false);
      setTicketToClose(null);
      loadTickets();
    } catch {
      showToast({ severity: "error", message: "Failed to update ticket" });
    }
  };

  const getPriorityColor = (
    priority: TicketPriority,
  ): "error" | "warning" | "default" => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="done">Done</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priorityFilter}
            label="Priority"
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={loadTickets}>
          Refresh
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm();
            setEditingTicket(null);
            setDialogOpen(true);
          }}
        >
          New Ticket
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
                    <TableCell>Title</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{ticket.title}</Typography>
                        {ticket.description && (
                          <Typography variant="body2" color="text.secondary">
                            {ticket.description.substring(0, 60)}
                            {ticket.description.length > 60 ? "..." : ""}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.priority.toUpperCase()}
                          color={getPriorityColor(ticket.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={ticket.status} />
                      </TableCell>
                      <TableCell>
                        {ticket.cost ? `$${ticket.cost.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(ticket.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => openEdit(ticket)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark as done">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openClose(ticket)}
                              disabled={ticket.status === "done"}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tickets.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 4 }}
                      >
                        <Typography color="text.secondary">
                          No maintenance tickets found
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

      {/* Ticket Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTicket(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingTicket ? "Edit Ticket" : "New Ticket"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={form.priority}
                  label="Priority"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: e.target.value as TicketPriority,
                    })
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as TicketStatus })
                  }
                >
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Asset ID"
                value={form.asset_id}
                onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                placeholder="Optional"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Assigned To (User ID)"
                value={form.assigned_to_user_id}
                onChange={(e) =>
                  setForm({ ...form, assigned_to_user_id: e.target.value })
                }
                placeholder="Optional"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Cost"
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="Optional"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingTicket(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={editingTicket ? handleUpdate : handleCreate}
          >
            {editingTicket ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={closeDialogOpen}
        onClose={() => {
          setCloseDialogOpen(false);
          setTicketToClose(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mark Ticket as Done</DialogTitle>
        <DialogContent>
          <Typography>
            Mark{" "}
            <Typography component="span" fontWeight={700}>
              {ticketToClose?.title}
            </Typography>{" "}
            as done?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCloseDialogOpen(false);
              setTicketToClose(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleClose}>
            Mark Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
