import { Box, Typography, Paper, Grid, Button } from "@mui/material";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const sections = [
    {
      title: "System Users",
      path: "/settings/users",
      desc: "Manage admin accounts and roles",
    },
    {
      title: "School Profile",
      path: "#",
      desc: "Update school details and logo",
    },
    {
      title: "Notifications",
      path: "#",
      desc: "Configure SMS and Email gateways",
    },
    { title: "Backups", path: "#", desc: "System backups and restore" },
  ];

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
              <Button
                component={Link}
                to={item.path}
                variant="outlined"
                size="small"
              >
                Manage
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
