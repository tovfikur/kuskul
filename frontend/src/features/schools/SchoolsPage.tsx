import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Grid,
} from "@mui/material";
import { Add, School, Login } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch } from "../../app/hooks";
import { setActiveSchoolId } from "../auth/authSlice";
import { useNavigate } from "react-router-dom";
import {
  listSchools,
  createSchool,
  deleteSchool,
  activateSchool,
  deactivateSchool,
  type School as SchoolType,
} from "../../api/schools";
import { showToast } from "../../app/toast";
import { restoreSession } from "../auth/authSlice";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .regex(
      /^[A-Z0-9_]+$/,
      "Code must be uppercase alphanumeric and underscores only",
    ),
});

type FormValues = z.infer<typeof schema>;

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolType | null>(null);
  const [busy, setBusy] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "" },
  });

  async function refresh() {
    setLoading(true);
    try {
      const data = await listSchools();
      setSchools(data);
    } catch {
      showToast({ severity: "error", message: "Failed to load schools" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (values: FormValues) => {
    setBusy(true);
    try {
      await createSchool(values);
      showToast({
        severity: "success",
        message: "School created successfully",
      });
      setCreateOpen(false);
      form.reset();
      await refresh();
      // Reload session to get new memberships containing the new school
      await dispatch(restoreSession());
    } catch (e: any) {
      if (e.response?.status === 409) {
        form.setError("code", { message: "School code already exists" });
      } else {
        showToast({ severity: "error", message: "Failed to create school" });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (school: SchoolType) => {
    try {
      if (school.is_active) {
        await deactivateSchool(school.id);
        showToast({ severity: "info", message: "School deactivated" });
      } else {
        await activateSchool(school.id);
        showToast({ severity: "success", message: "School activated" });
      }
      await refresh();
    } catch {
      showToast({
        severity: "error",
        message: "Failed to update school status",
      });
    }
  };

  const confirmDelete = (school: SchoolType) => {
    setSchoolToDelete(school);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!schoolToDelete) return;
    setBusy(true);
    try {
      await deleteSchool(schoolToDelete.id);
      showToast({
        severity: "success",
        message: "School deleted successfully",
      });
      setDeleteOpen(false);
      setSchoolToDelete(null);
      await refresh();
      await dispatch(restoreSession());
    } catch {
      showToast({ severity: "error", message: "Failed to delete school" });
    } finally {
      setBusy(false);
    }
  };

  const handleLoginToSchool = (schoolId: string) => {
    dispatch(setActiveSchoolId(schoolId));
    navigate("/dashboard");
    showToast({
      severity: "success",
      message: "Switched active school context",
    });
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            Manage Schools
          </Typography>
          <Typography color="text.secondary">
            Manage your tenant schools and create new ones.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
        >
          Create School
        </Button>
      </Stack>

      {loading ? (
        <Box textAlign="center" py={8}>
          <CircularProgress />
        </Box>
      ) : schools.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ py: 8, textAlign: "center", borderRadius: 3 }}
        >
          <School color="disabled" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No schools found
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {schools.map((school) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={school.id}>
              <Card
                variant="outlined"
                sx={{ borderRadius: 3, position: "relative" }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "primary.50",
                        color: "primary.main",
                      }}
                    >
                      <School />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600} noWrap>
                        {school.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontFamily="monospace"
                      >
                        {school.code}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={2}
                  >
                    <Chip
                      label={school.is_active ? "Active" : "Inactive"}
                      color={school.is_active ? "success" : "default"}
                      size="small"
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        color={school.is_active ? "warning" : "success"}
                        onClick={() => handleToggleActive(school)}
                      >
                        {school.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => confirmDelete(school)}
                      >
                        Delete
                      </Button>
                      {school.is_active && (
                        <Button
                          size="small"
                          variant="contained"
                          endIcon={<Login />}
                          onClick={() => handleLoginToSchool(school.id)}
                        >
                          Switch To
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box component="form" onSubmit={form.handleSubmit(handleCreate)}>
          <DialogTitle sx={{ fontWeight: 700 }}>Create New School</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="School Name"
                fullWidth
                {...form.register("name")}
                error={!!form.formState.errors.name}
                helperText={form.formState.errors.name?.message}
                disabled={busy}
              />
              <TextField
                label="School Code"
                fullWidth
                {...form.register("code")}
                error={!!form.formState.errors.code}
                helperText={
                  form.formState.errors.code?.message ??
                  "Uppercase alphanumeric only (e.g. MAIN_CAMPUS)"
                }
                disabled={busy}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {busy ? <CircularProgress size={24} /> : "Create School"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => !busy && setDeleteOpen(false)}>
        <DialogTitle>Delete School</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{schoolToDelete?.name}</strong>? This action will deactivate
            the school, revoke all memberships, and hide it from all dashboards.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={busy}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={busy}
            variant="contained"
            color="error"
          >
            {busy ? <CircularProgress size={24} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
