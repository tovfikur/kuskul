import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ContentCopy,
  Link as LinkIcon,
  MoreVert,
  Refresh,
  Shield,
  ToggleOff,
  ToggleOn,
} from "@mui/icons-material";

import type { Tenant } from "../../../api/platform";

type StatusFilter = "all" | "active" | "inactive";

export function TenantsTable(props: {
  tenants: Tenant[];
  loading?: boolean;
  onRefresh: () => void;
  onToggleStatus: (tenant: Tenant) => void;
  onEditAdmin: (tenant: Tenant) => void;
  buildTenantUrl: (tenant: Tenant) => string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.tenants
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          t.subdomain.toLowerCase().includes(q) ||
          (t.custom_domain || "").toLowerCase().includes(q)
        );
      });
  }, [props.tenants, query, status]);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4 }}>
      <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "divider" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ md: "center" }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900 }}>Tenants</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage tenant status and access. School data is not visible here.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <TextField
              size="small"
              placeholder="Search tenants"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: { sm: 260 } }}
            />
            <TextField
              select
              size="small"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 160 }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={props.onRefresh}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Subdomain</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Admin email</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 160 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && !props.loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ py: 4, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 900 }}>
                      No tenants found
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      Try clearing filters or create a new tenant.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  buildTenantUrl={props.buildTenantUrl}
                  onToggleStatus={props.onToggleStatus}
                  onEditAdmin={props.onEditAdmin}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function TenantRow(props: {
  tenant: Tenant;
  buildTenantUrl: (tenant: Tenant) => string;
  onToggleStatus: (tenant: Tenant) => void;
  onEditAdmin: (tenant: Tenant) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const url = props.buildTenantUrl(props.tenant);

  return (
    <TableRow hover>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Shield fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {props.tenant.name}
            </Typography>
            {props.tenant.custom_domain ? (
              <Typography variant="caption" color="text.secondary">
                {props.tenant.custom_domain}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontFamily: "monospace" }}>
          {props.tenant.subdomain}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontFamily: "monospace" }}>
          {props.tenant.admin_email ?? "-"}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={props.tenant.status}
          color={props.tenant.status === "active" ? "success" : "default"}
          variant={props.tenant.status === "active" ? "filled" : "outlined"}
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton
            size="small"
            onClick={() => {
              window.open(url, "_blank", "noreferrer");
            }}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreVert fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                props.onToggleStatus(props.tenant);
              }}
            >
              {props.tenant.status === "active" ? (
                <ToggleOff fontSize="small" />
              ) : (
                <ToggleOn fontSize="small" />
              )}
              <Box sx={{ ml: 1 }}>
                {props.tenant.status === "active" ? "Deactivate" : "Activate"}
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                props.onEditAdmin(props.tenant);
              }}
            >
              <Shield fontSize="small" />
              <Box sx={{ ml: 1 }}>Edit admin credentials</Box>
            </MenuItem>
          </Menu>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
