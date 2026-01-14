import { Box, Typography, Paper, Grid } from "@mui/material";

export default function LogisticsPage() {
  const sections = ["Transport", "Library", "Inventory", "Hostel"];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Logistics & Operations
      </Typography>
      <Grid container spacing={3}>
        {sections.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item}>
            <Paper sx={{ p: 3, textAlign: "center", height: "100%" }}>
              <Typography variant="h6">{item}</Typography>
              <Typography color="text.secondary">
                Manage {item.toLowerCase()}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
