import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

import {
  createDiscount,
  deleteDiscount,
  getDiscounts,
  updateDiscount,
  type Discount,
} from "../../../api/finance";
import { showToast } from "../../../app/toast";
import { DiscountDialog, type DiscountForm } from "./DiscountDialog";
import { DiscountApplyDrawer } from "./DiscountApplyDrawer";

const emptyForm: DiscountForm = {
  name: "",
  discount_type: "percent",
  value: "",
  description: "",
};

export function DiscountsTab() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Discount[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("New Discount");
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<DiscountForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getDiscounts();
      setRows(list);
    } catch {
      showToast({ severity: "error", message: "Failed to load discounts" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDialogTitle("New Discount");
    setDialogInitial(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditingId(d.id);
    setDialogTitle("Edit Discount");
    setDialogInitial({
      name: d.name,
      discount_type: d.discount_type,
      value: String(d.value),
      description: d.description ?? "",
    });
    setDialogOpen(true);
  };

  const save = async (data: { name: string; discount_type: "percent" | "fixed"; value: number; description: string | null }) => {
    setDialogSaving(true);
    try {
      if (!editingId) {
        await createDiscount(data);
      } else {
        await updateDiscount(editingId, data);
      }
      setDialogOpen(false);
      await load();
    } catch {
      showToast({ severity: "error", message: "Failed to save discount" });
    } finally {
      setDialogSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    try {
      await deleteDiscount(id);
      await load();
    } catch {
      showToast({ severity: "error", message: "Failed to delete discount" });
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Discounts
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              Configure discounts and apply them to students.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Chip size="small" label={`Discounts: ${rows.length}`} variant="outlined" />
            <Button variant="outlined" startIcon={<LocalOfferIcon />} onClick={() => setApplyOpen(true)}>
              Apply
            </Button>
            <Button variant="contained" onClick={openCreate}>
              New Discount
            </Button>
          </Box>
        </Box>

        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell>{d.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={d.discount_type}
                      color={d.discount_type === "percent" ? "info" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{d.value}</TableCell>
                  <TableCell>{d.description ?? "—"}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(d)} aria-label="edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => void remove(d.id)} aria-label="delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No discounts configured.</TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <DiscountDialog
        open={dialogOpen}
        title={dialogTitle}
        initial={dialogInitial}
        saving={dialogSaving}
        onClose={() => setDialogOpen(false)}
        onSubmit={(data) => save(data)}
      />

      <DiscountApplyDrawer
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        discounts={rows}
        onApplied={() => {
          void load();
        }}
      />
    </Box>
  );
}

