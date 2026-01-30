import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAppSelector } from "../app/hooks";

type Feature = {
  title: string;
  description: string;
  glyph: string;
};

const features: Feature[] = [
  {
    title: "Academic",
    description:
      "Curriculum, classes, subjects, timetables, and years in one place.",
    glyph: "A",
  },
  {
    title: "Students",
    description: "Admissions, profiles, guardians, enrollments, and reports.",
    glyph: "S",
  },
  {
    title: "Staff",
    description:
      "Directory, attendance, performance, leave, documents, and payroll.",
    glyph: "T",
  },
  {
    title: "Exams",
    description: "Exam masters, schedules, marks entry, and results workflows.",
    glyph: "E",
  },
  {
    title: "Finance",
    description: "Fees, dues, payments, invoices, discounts, and reporting.",
    glyph: "F",
  },
  {
    title: "Logistics",
    description: "Assets, procurement, inventory, maintenance, and transport.",
    glyph: "L",
  },
  {
    title: "Events",
    description: "Events calendar and notices to keep everyone aligned.",
    glyph: "N",
  },
  {
    title: "Settings",
    description: "Tenant settings and system users administration.",
    glyph: "C",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAppSelector((s) => s.auth.accessToken);
  const sessionChecked = useAppSelector((s) => s.auth.sessionChecked);
  const status = useAppSelector((s) => s.auth.status);
  const isPlatformAdmin = useAppSelector((s) => s.auth.isPlatformAdmin);

  useEffect(() => {
    if (!sessionChecked || status === "loading") {
      return;
    }
    if (!token) {
      return;
    }
    navigate(isPlatformAdmin ? "/saas-admin" : "/dashboard", { replace: true });
  }, [isPlatformAdmin, navigate, sessionChecked, status, token]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                }}
              >
                K
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, letterSpacing: -0.2 }}
              >
                KusKul
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack spacing={2.5}>
              <Typography
                variant="h3"
                sx={{ fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.1 }}
              >
                Multi-tenant school operations, built for scale.
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: 16, lineHeight: 1.7 }}
              >
                KusKul keeps your academic, people, finance, and logistics
                workflows in one secure system. Each school runs in complete
                isolation, while platform admins manage tenants from a dedicated
                SaaS console.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  size="large"
                  variant="contained"
                  onClick={() => navigate("/login")}
                >
                  Sign in
                </Button>
                <Button
                  size="large"
                  variant="outlined"
                  onClick={() => {
                    const el = document.getElementById("features");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Explore features
                </Button>
              </Stack>
              <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
                <Paper
                  variant="outlined"
                  sx={{ px: 2, py: 1.25, borderRadius: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Tenant isolation
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    By `tenant_id`
                  </Typography>
                </Paper>
                <Paper
                  variant="outlined"
                  sx={{ px: 2, py: 1.25, borderRadius: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    SaaS admin
                  </Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    Manage schools
                  </Typography>
                </Paper>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                borderRadius: 4,
                p: 3,
                bgcolor: "background.paper",
              }}
            >
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Why teams choose KusKul
                </Typography>
                <Stack spacing={1}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography sx={{ fontWeight: 900 }}>
                      True tenant isolation
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Every school’s data and access stays scoped to
                      `tenant_id`.
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography sx={{ fontWeight: 900 }}>
                      SaaS-level control
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Provision tenants, reset admin access, and suspend schools
                      instantly.
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography sx={{ fontWeight: 900 }}>
                      Operator-first UX
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Fast navigation, consistent dialogs, and predictable
                      workflows.
                    </Typography>
                  </Paper>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Box id="features" sx={{ pt: { xs: 8, md: 10 } }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900, letterSpacing: -0.4 }}
            >
              Everything schools need
            </Typography>
            <Typography color="text.secondary">
              Modular workflows that stay consistent across tenants.
            </Typography>
          </Stack>
          <Grid container spacing={2.5}>
            {features.map((f) => (
              <Grid key={f.title} item xs={12} sm={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    height: "100%",
                    p: 2.5,
                    borderRadius: 4,
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
                  }}
                >
                  <Stack spacing={1.25}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                      }}
                    >
                      {f.glyph}
                    </Box>
                    <Typography sx={{ fontWeight: 900 }}>{f.title}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6 }}
                    >
                      {f.description}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box sx={{ mt: { xs: 8, md: 10 }, textAlign: "center" }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 900, letterSpacing: -0.4 }}
          >
            Start with secure sign-in.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Platform admins manage tenants. Tenant admins run schools. Everyone
            stays scoped.
          </Typography>
          <Button
            size="large"
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate("/login")}
          >
            Sign in
          </Button>
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 5 }}>
        <Divider sx={{ mb: 3 }} />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            alignItems: { sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} KusKul
          </Typography>
          <Stack direction="row" spacing={2}>
            <Link href="#" underline="hover" color="text.secondary">
              Privacy
            </Link>
            <Link href="#" underline="hover" color="text.secondary">
              Terms
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
