import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Category, Delete, Edit, Straighten } from "@mui/icons-material";
import {
  deleteLogisticsAssetCategory,
  deleteLogisticsUom,
  listLogisticsAssetCategories,
  listLogisticsUoms,
  saveLogisticsAssetCategory,
  saveLogisticsUom,
  type LogisticsAssetCategory,
  type LogisticsSettingStatus,
  type LogisticsUom,
} from "../../logisticsSettings";

type SettingsSection = "uom" | "asset-categories";

type UomForm = {
  name: string;
  code: string;
  examples: string;
  status: LogisticsSettingStatus;
};

type CategoryForm = {
  name: string;
  code: string;
  status: LogisticsSettingStatus;
};

export default function SettingsTab() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("uom");

  return (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeSection}
          onChange={(_, value) => setActiveSection(value)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<Straighten />}
            iconPosition="start"
            label="UoM"
            value="uom"
          />
          <Tab
            icon={<Category />}
            iconPosition="start"
            label="Asset Categories"
            value="asset-categories"
          />
        </Tabs>
      </Paper>

      {activeSection === "uom" && <UomSection />}
      {activeSection === "asset-categories" && <AssetCategoriesSection />}
    </Box>
  );
}

function UomSection() {
  const [uoms, setUoms] = useState<LogisticsUom[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUom, setEditingUom] = useState<LogisticsUom | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<UomForm>({
    name: "",
    code: "",
    examples: "",
    status: "active",
  });

  const loadUoms = () => setUoms(listLogisticsUoms());

  useEffect(() => {
    loadUoms();
  }, []);

  const handleAdd = () => {
    setEditingUom(null);
    setForm({ name: "", code: "", examples: "", status: "active" });
    setError("");
    setDialogOpen(true);
  };

  const handleEdit = (uom: LogisticsUom) => {
    setEditingUom(uom);
    setForm({
      name: uom.name,
      code: uom.code,
      examples: uom.examples || "",
      status: uom.status,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required");
      return;
    }

    saveLogisticsUom({
      id: editingUom?.id,
      name: form.name.trim(),
      code: form.code.trim().toLowerCase(),
      examples: form.examples.trim() || undefined,
      status: form.status,
    });
    setDialogOpen(false);
    loadUoms();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this UoM?")) return;
    deleteLogisticsUom(id);
    loadUoms();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">UoM</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add UoM
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Examples</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uoms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No UoM found
                </TableCell>
              </TableRow>
            ) : (
              uoms.map((uom) => (
                <TableRow key={uom.id}>
                  <TableCell>{uom.name}</TableCell>
                  <TableCell>
                    <Chip label={uom.code} size="small" />
                  </TableCell>
                  <TableCell>{uom.examples || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={uom.status === "active" ? "Active" : "Inactive"}
                      color={uom.status === "active" ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(uom)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(uom.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUom ? "Edit UoM" : "Add UoM"}</DialogTitle>
        <DialogContent>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            helperText="Examples: pcs, ream, litre"
          />
          <TextField
            label="Examples"
            fullWidth
            margin="normal"
            value={form.examples}
            onChange={(e) => setForm({ ...form, examples: e.target.value })}
            placeholder="e.g. A4 paper, sanitizer, notebooks"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.status === "active"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.checked ? "active" : "inactive",
                  })
                }
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingUom ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function AssetCategoriesSection() {
  const [categories, setCategories] = useState<LogisticsAssetCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<LogisticsAssetCategory | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    code: "",
    status: "active",
  });

  const loadCategories = () => setCategories(listLogisticsAssetCategories());

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setForm({ name: "", code: "", status: "active" });
    setError("");
    setDialogOpen(true);
  };

  const handleEdit = (category: LogisticsAssetCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      code: category.code,
      status: category.status,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = () => {
    setError("");
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required");
      return;
    }

    saveLogisticsAssetCategory({
      id: editingCategory?.id,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      status: form.status,
    });
    setDialogOpen(false);
    loadCategories();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this asset category?")) return;
    deleteLogisticsAssetCategory(id);
    loadCategories();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Asset Categories</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          Add Asset Category
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No asset categories found
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>
                    <Chip label={category.code} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={category.status === "active" ? "Active" : "Inactive"}
                      color={
                        category.status === "active" ? "success" : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? "Edit Asset Category" : "Add Asset Category"}
        </DialogTitle>
        <DialogContent>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <TextField
            label="Name"
            fullWidth
            margin="normal"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <TextField
            label="Code"
            fullWidth
            margin="normal"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            helperText="Examples: IT, FURNITURE, VEHICLE"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.status === "active"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.checked ? "active" : "inactive",
                  })
                }
              />
            }
            label="Active"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingCategory ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
