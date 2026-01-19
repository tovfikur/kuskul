import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { showToast } from "../../app/toast";

export default function SettingsPage() {
  const sections = useMemo(
    () => [
    {
      title: "System Users",
      path: "/settings/users",
      desc: "Manage admin accounts and roles",
    },
    {
      title: "School Profile",
      path: "",
      desc: "Update school details and logo",
    },
    {
      title: "Notifications",
      path: "",
      desc: "Configure SMS and Email gateways",
    },
    { title: "Backups", path: "", desc: "System backups and restore" },
    ],
    []
  );

  const [schoolProfileOpen, setSchoolProfileOpen] = useState(false);
  const [schoolProfileLoading, setSchoolProfileLoading] = useState(false);
  const [schoolProfileSaving, setSchoolProfileSaving] = useState(false);
  const [schoolProfileForm, setSchoolProfileForm] = useState({
    address: "",
    phone: "",
    website: "",
    logo_url: "",
  });

  useEffect(() => {
    if (!schoolProfileOpen) return;
    setSchoolProfileLoading(true);
    api
      .get("/settings")
      .then((resp) => {
        const rows = (resp.data as Array<{ key: string; value: string }>).map(
          (r) => ({ key: r.key, value: r.value })
        );
        const map = new Map(rows.map((r) => [r.key, r.value]));
        setSchoolProfileForm({
          address: map.get("school.profile.address") ?? "",
          phone: map.get("school.profile.phone") ?? "",
          website: map.get("school.profile.website") ?? "",
          logo_url: map.get("school.profile.logo_url") ?? "",
        });
      })
      .catch((e) => {
        console.error(e);
        showToast({
          severity: "error",
          message: "Failed to load school profile",
        });
      })
      .finally(() => setSchoolProfileLoading(false));
  }, [schoolProfileOpen]);

  async function saveSchoolProfile() {
    setSchoolProfileSaving(true);
    try {
      await Promise.all([
        api.put("/settings/school.profile.address", {
          value: schoolProfileForm.address,
        }),
        api.put("/settings/school.profile.phone", {
          value: schoolProfileForm.phone,
        }),
        api.put("/settings/school.profile.website", {
          value: schoolProfileForm.website,
        }),
        api.put("/settings/school.profile.logo_url", {
          value: schoolProfileForm.logo_url,
        }),
      ]);
      setSchoolProfileOpen(false);
    } catch (e) {
      console.error(e);
      showToast({ severity: "error", message: "Failed to save school profile" });
    } finally {
      setSchoolProfileSaving(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        System Settings
      </Typography>
      <Grid container spacing={3}>
        {sections.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title}>
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="h6">{item.title}</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {item.desc}
                </Typography>
              </Box>
              {item.path ? (
                <Button
                  component={Link}
                  to={item.path}
                  variant="outlined"
                  size="small"
                >
                  Manage
                </Button>
              ) : item.title === "School Profile" ? (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSchoolProfileOpen(true)}
                >
                  Manage
                </Button>
              ) : (
                <Button variant="outlined" size="small" disabled>
                  Coming soon
                </Button>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={schoolProfileOpen}
        onClose={() => setSchoolProfileOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>School Profile</DialogTitle>
        <DialogContent>
          {schoolProfileLoading ? (
            <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <TextField
                label="School Address"
                fullWidth
                margin="normal"
                value={schoolProfileForm.address}
                onChange={(e) =>
                  setSchoolProfileForm((p) => ({
                    ...p,
                    address: e.target.value,
                  }))
                }
                multiline
                minRows={2}
              />
              <TextField
                label="School Phone"
                fullWidth
                margin="normal"
                value={schoolProfileForm.phone}
                onChange={(e) =>
                  setSchoolProfileForm((p) => ({
                    ...p,
                    phone: e.target.value,
                  }))
                }
              />
              <TextField
                label="School Website"
                fullWidth
                margin="normal"
                value={schoolProfileForm.website}
                onChange={(e) =>
                  setSchoolProfileForm((p) => ({
                    ...p,
                    website: e.target.value,
                  }))
                }
              />
              <TextField
                label="Logo URL"
                fullWidth
                margin="normal"
                value={schoolProfileForm.logo_url}
                onChange={(e) =>
                  setSchoolProfileForm((p) => ({
                    ...p,
                    logo_url: e.target.value,
                  }))
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchoolProfileOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveSchoolProfile}
            disabled={schoolProfileLoading || schoolProfileSaving}
          >
            {schoolProfileSaving ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
