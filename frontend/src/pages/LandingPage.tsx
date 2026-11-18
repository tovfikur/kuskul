import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useAppSelector } from "../app/hooks";
import { ScrollFrameHero, type HeroStage } from "../components/ScrollFrameHero";

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

];

const heroStages: HeroStage[] = [
  {
    id: "stage-0",
    type: "image",
    src: "/header_resource/start.jpeg",
    topLayer: "/header_resource/top-start.png",
    title: "Your school, elevated.",
    subtitle: "Efficiency re-imagined.", 
    textVariant: "standard"
  },
  {
    id: "stage-1",
    type: "video",
    src: "/header_resource/202602040431-1.mp4",
    title: "Admissions Made Simple",
    subtitle: "From Chaos to Order",
    textVariant: "chaos"
  },
  {
    id: "stage-2",
    type: "video",
    src: "/header_resource/202602040431-2.mp4",
    title: "Focus On Learning",
    subtitle: "We handle the rest",
    textVariant: "fade-zoom"
  },
  {
    id: "stage-3",
    type: "video",
    src: "/header_resource/202602040431-3.mp4",
    endFrame: "/header_resource/3rd-end.png",
    title: "Connected Community",
    subtitle: "Growing together daily",
    textVariant: "bang"
  },
  {
    id: "stage-4",
    type: "video",
    src: "/header_resource/202602040431-4.mp4",
    title: "Financial Clarity",
    subtitle: "Secure. Transparent. Easy.",
    textVariant: "slide-down"
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const token = useAppSelector((s: any) => s.auth.accessToken);
  const sessionChecked = useAppSelector((s: any) => s.auth.sessionChecked);
  const status = useAppSelector((s: any) => s.auth.status);
  const isPlatformAdmin = useAppSelector((s: any) => s.auth.isPlatformAdmin);
  const roleName = useAppSelector((s: any) => s.auth.memberships[0]?.role_name);

  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!sessionChecked || status === "loading") return;
    if (!token) return;
    
    if (isPlatformAdmin) {
      navigate("/saas-admin", { replace: true });
    } else if (roleName === "student") {
      navigate("/student-portal", { replace: true });
    } else if (roleName === "parent" || roleName === "guardian") {
      navigate("/guardian-portal", { replace: true });
    } else if (roleName === "teacher") {
      navigate("/teacher-portal", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [isPlatformAdmin, navigate, sessionChecked, status, token, roleName]);

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const key = (entry.target as HTMLElement).dataset.reveal;
          if (!key) continue;
          setRevealed((prev: Record<string, boolean>) => (prev[key] ? prev : { ...prev, [key]: true }));
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
    );

    for (const n of nodes) observer.observe(n);
    return () => observer.disconnect();
  }, []);

  const revealSx = (key: string) => ({
    opacity: revealed[key] ? 1 : 0,
    transform: revealed[key]
      ? "perspective(1500px) rotateX(0deg) translateY(0) scale(1) translateZ(0)"
      : "perspective(1500px) rotateX(60deg) translateY(100px) scale(0.85) translateZ(-100px)",
    transformOrigin: "50% 100%", 
    willChange: "transform, opacity",
    transition: "opacity 1.2s cubic-bezier(0.2, 0.8, 0.2, 1), transform 1.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Button
        variant="contained"
        onClick={() => navigate("/login")}
        sx={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 100,
          borderRadius: 999,
          px: 3,
          py: 1,
          bgcolor: "white",
          color: "black",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          fontWeight: 600,
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.9)",
            transform: "scale(1.05)",
          },
          transition: "all 0.2s ease",
        }}
      >
        Sign in
      </Button>

      {/* New Video Hero */}
      <ScrollFrameHero stages={heroStages} />

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Box
          data-reveal="preview"
          sx={{ ...revealSx("preview"), mb: { xs: 7, md: 9 } }}
        >
          <Grid container spacing={2.5} sx={{ width: "100%" }}>
            {[
              {
                title: "Secure by design",
                desc: "Tenant-scoped queries, permissions, and audit trails.",
              },
              {
                title: "Fast operations",
                desc: "Operator-first UX across modules for daily workflows.",
              },
              {
                title: "SaaS console",
                desc: "Provision tenants and manage access securely.",
              },
            ].map((b) => (
              <Grid key={b.title} size={{ xs: 12, md: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 5,
                    height: "100%",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
                    backdropFilter: "blur(10px)",
                    transition: "transform 160ms ease, box-shadow 160ms ease",
                    "&:hover": { transform: "translateY(-4px) rotateX(2deg)", boxShadow: 4 },
                  }}
                >
                  <Typography sx={{ fontWeight: 950, letterSpacing: -0.2 }}>
                    {b.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, lineHeight: 1.7 }}
                  >
                    {b.desc}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box id="features" data-reveal="features" sx={{ minHeight: "60vh" }}>
          
          <Stack spacing={1} sx={{ mb: 6, textAlign: "center", ...revealSx("features") }}>
            <Typography
              variant="h3"
              sx={{ 
                  fontFamily: '"Oldenburg", serif',
                  fontWeight: 400, 
                  letterSpacing: "-0.02em",
                  background: "linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 1
              }}
            >
              Everything your campus needs
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 400 }}>
              Academic workflows and operations—designed for modern education.
            </Typography>
          </Stack>

          
          <Grid container spacing={3} sx={{ width: "100%" }}>
            {features.map((f, i) => (
              <Grid key={f.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  elevation={0}
                  sx={{
                    height: "100%",
                    p: 3,
                    borderRadius: 4,
                    // Glassmorphism
                    background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.05)",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    
                    // Staggered Reveal
                    opacity: revealed["features"] ? 1 : 0,
                    transform: revealed["features"] 
                        ? "translateY(0) scale(1)" 
                        : "translateY(40px) scale(0.9)",
                    transitionDelay: `${i * 100}ms`, // Stagger effect

                    "&:hover": { 
                        transform: "translateY(-8px) scale(1.02)", 
                        boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.8)",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)",
                    },
                  }}
                >
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: "14px",
                        background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                        color: "#1565c0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1.5rem",
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                        transition: "transform 0.3s ease",
                        ".MuiPaper-root:hover &": {
                            transform: "rotate(10deg) scale(1.1)",
                            background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
                            color: "white"
                        }
                      }}
                    >
                      {f.glyph}
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, mb: 1 }}>
                            {f.title}
                        </Typography>
                        <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.6, fontFamily: '"Plus Jakarta Sans", sans-serif' }}
                        >
                        {f.description}
                        </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Box
          data-reveal="pricing"
          sx={{ ...revealSx("pricing"), mt: { xs: 7, md: 9 } }}
        >
          <Stack
            spacing={1}
            sx={{ mb: 3, textAlign: { xs: "left", md: "center" } }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 950, letterSpacing: -0.5 }}
            >
              Simple, transparent pricing
            </Typography>
            <Typography color="text.secondary">
              Start small, upgrade as your student body grows.
            </Typography>
          </Stack>
          <Grid
            container
            spacing={2.5}
            alignItems="stretch"
            sx={{ width: "100%" }}
          >
            {[
              {
                title: "Essential",
                price: "Free",
                note: "Up to 50 students",
                items: ["Core academics", "Attendance tracking", "Basic reports"],
                cta: "Try for free",
              },
              {
                title: "Growth",
                price: "$2",
                note: "Per student / month",
                items: [
                  "All modules",
                  "App for Parents",
                  "SMS & Email",
                ],
                cta: "Get Started",
                highlight: true,
              },
              {
                title: "Campus",
                price: "Custom",
                note: "For large institutions",
                items: [
                  "Priority support",
                  "Custom domain",
                  "Dedicated training",
                  "Data migration",
                ],
                cta: "Contact Sales",
              },
            ].map((p) => (
              <Grid key={p.title} size={{ xs: 12, md: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 5,
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    borderColor: p.highlight ? "primary.main" : "divider",
                    boxShadow: p.highlight
                      ? "0 18px 60px rgba(25,118,210,0.16)"
                      : "none",
                    transition: "transform 160ms ease, box-shadow 160ms ease",
                    "&:hover": {
                      transform: "translateY(-4px) rotateX(2deg)",
                      boxShadow: p.highlight
                        ? "0 22px 70px rgba(25,118,210,0.20)"
                        : 4,
                    },
                  }}
                >
                  {p.highlight ? (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background:
                          "linear-gradient(135deg, rgba(25,118,210,0.10), rgba(156,39,176,0.06))",
                      }}
                    />
                  ) : null}
                  <Stack spacing={1.5} sx={{ position: "relative" }}>
                    <Typography sx={{ fontWeight: 950, letterSpacing: -0.2 }}>
                      {p.title}
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 950, letterSpacing: -0.8 }}
                    >
                      {p.price}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {p.note}
                    </Typography>
                    <Divider />
                    <Stack spacing={0.75}>
                      {p.items.map((it) => (
                        <Typography key={it} variant="body2">
                          • {it}
                        </Typography>
                      ))}
                    </Stack>
                    <Box sx={{ pt: 1 }}>
                      <Button
                        fullWidth
                        variant={p.highlight ? "contained" : "outlined"}
                        onClick={() =>
                          p.cta === "Try for free" || p.cta === "Get Started"
                            ? navigate("/login")
                            : window.open(
                                "mailto:sales@example.com?subject=School%20System%20Pricing",
                                "_blank",
                              )
                        }
                      >
                        {p.cta}
                      </Button>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: { xs: 6, md: 8 }, textAlign: "center" }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 950, letterSpacing: -0.5 }}
            >
              Launch your school online. Run it efficiently.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              From admissions to exams, handle it all on one secure platform.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="center"
              sx={{ mt: 2 }}
            >
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
                onClick={() =>
                  window.open(
                    "mailto:sales@example.com?subject=School%20System%20Demo",
                    "_blank",
                  )
                }
              >
                Request demo
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
