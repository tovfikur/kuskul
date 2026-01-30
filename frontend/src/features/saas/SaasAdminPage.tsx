import { useEffect, useMemo, useState } from "react";
import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { Add } from "@mui/icons-material";

import {
  listTenants,
  provisionTenant,
  updateTenantStatus,
  updateTenantAdmin,
  type Tenant,
} from "../../api/platform";
import { showToast } from "../../app/toast";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { TenantsTable } from "./components/TenantsTable";
import {
  CreateTenantDialog,
  EditTenantAdminDialog,
} from "./components/TenantDialogs";

export function SaasAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listTenants();
      setTenants(rows);
    } catch {
      showToast({ severity: "error", message: "Failed to load tenants" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const baseDomain = useMemo(() => {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "localhost";
    }
    if (host.endsWith(".localhost")) {
      return "localhost";
    }
    if (host.endsWith(".lvh.me")) {
      return "lvh.me";
    }
    return host.split(".").slice(-2).join(".");
  }, []);

  const portPart = window.location.port ? `:${window.location.port}` : "";

  const buildTenantUrl = (tenant: Tenant) => {
    const custom = tenant.custom_domain?.trim();
    if (custom) {
      return `${window.location.protocol}//${custom}${portPart}/`;
    }
    return `${window.location.protocol}//${tenant.subdomain}.${baseDomain}${portPart}/`;
  };

  const handleCreate = async (values: {
    name: string;
    subdomain: string;
    admin_email: string;
    admin_password: string;
  }) => {
    setBusy(true);
    try {
      const resp = await provisionTenant({
        name: values.name,
        subdomain: values.subdomain,
        admin_email: values.admin_email,
        admin_password: values.admin_password,
        school_name: values.name,
      });
      setTenants((prev) => [resp.tenant, ...prev]);
      showToast({ severity: "success", message: "Tenant created" });
      setCreateOpen(false);
    } catch {
      showToast({ severity: "error", message: "Failed to create tenant" });
      throw new Error("create_failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleTenant = async (tenant: Tenant) => {
    setBusy(true);
    try {
      const next = tenant.status === "active" ? "inactive" : "active";
      const updated = await updateTenantStatus(tenant.id, next);
      setTenants((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      showToast({
        severity: "success",
        message: next === "active" ? "Tenant activated" : "Tenant deactivated",
      });
    } catch {
      showToast({
        severity: "error",
        message: "Failed to update tenant status",
      });
    } finally {
      setBusy(false);
    }
  };

  const openEditAdmin = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditAdminOpen(true);
  };

  const handleEditAdmin = async (values: {
    current_admin_email: string;
    new_admin_email?: string;
    new_password?: string;
  }) => {
    if (!editTenant) {
      return;
    }
    setBusy(true);
    try {
      const updated = await updateTenantAdmin({
        tenant_id: editTenant.id,
        current_admin_email: values.current_admin_email,
        new_admin_email: values.new_admin_email ?? null,
        new_password: values.new_password ?? null,
      });
      setTenants((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
      showToast({ severity: "success", message: "Admin updated" });
      setEditAdminOpen(false);
      setEditTenant(null);
    } catch {
      showToast({ severity: "error", message: "Failed to update admin" });
      throw new Error("admin_update_failed");
    } finally {
      setBusy(false);
    }
  };

  const total = tenants.length;
  const active = tenants.filter((t) => t.status === "active").length;
  const inactive = total - active;

  return (
    <SaasAdminLayout>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ md: "center" }}
        sx={{ mb: 3 }}
      >
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 900, letterSpacing: -0.6 }}
          >
            Tenants
          </Typography>
          <Typography color="text.secondary">
            Provision and manage schools without accessing their internal data.
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateOpen(true)}
        >
          Create tenant
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} md={4}>
          <KpiCard label="Total tenants" value={total} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard label="Active" value={active} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard label="Inactive" value={inactive} />
        </Grid>
      </Grid>

      <TenantsTable
        tenants={tenants}
        loading={loading}
        onRefresh={refresh}
        onToggleStatus={toggleTenant}
        onEditAdmin={openEditAdmin}
        buildTenantUrl={buildTenantUrl}
      />

      <CreateTenantDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
        busy={busy}
      />

      <EditTenantAdminDialog
        open={editAdminOpen}
        onClose={() => {
          setEditAdminOpen(false);
          setEditTenant(null);
        }}
        tenantName={editTenant?.name ?? ""}
        currentAdminEmail={editTenant?.admin_email ?? ""}
        onSave={handleEditAdmin}
        busy={busy}
      />
    </SaasAdminLayout>
  );
}

function KpiCard(props: { label: string; value: number }) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 4, p: 2.5, bgcolor: "background.paper" }}
    >
      <Typography variant="body2" color="text.secondary">
        {props.label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
        {props.value}
      </Typography>
    </Paper>
  );
}
