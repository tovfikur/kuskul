import { Outlet } from "react-router-dom";
import { Box, Container, Paper, Typography } from "@mui/material";
import { School as SchoolIcon } from "@mui/icons-material";

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 4,
          }}
        >
          <SchoolIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" color="primary">
            KusKul
          </Typography>
          <Typography variant="body1" color="text.secondary">
            School Management System
          </Typography>
        </Box>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: "100%",
            borderRadius: 3,
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}
