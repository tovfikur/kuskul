import { Alert, Box, Paper, Typography } from "@mui/material";

export function InvoicesTab() {
  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Invoices
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
        Issue invoices and track invoice lifecycle.
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Alert severity="info">
          Invoices are planned but not implemented on the backend yet. For now, use Fee
          Structures, Payments, Dues, Discounts, and Reports.
        </Alert>
      </Box>
    </Paper>
  );
}

