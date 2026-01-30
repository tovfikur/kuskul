import { api } from "./client";

export type Tenant = {
  id: string;
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  status: string;
  admin_email?: string | null;
};

export type TenantProvisionRequest = {
  name: string;
  subdomain: string;
  custom_domain?: string | null;
  admin_email: string;
  admin_password: string;
  school_name: string;
  school_code?: string | null;
};

export type TenantProvisionResponse = {
  tenant: Tenant;
  school_id: string;
  admin_user_id: string;
};

export async function listTenants(): Promise<Tenant[]> {
  const resp = await api.get("/platform/tenants");
  return resp.data as Tenant[];
}

export async function provisionTenant(payload: TenantProvisionRequest): Promise<TenantProvisionResponse> {
  const resp = await api.post("/platform/tenants", payload);
  return resp.data as TenantProvisionResponse;
}

export async function updateTenantStatus(tenantId: string, status: "active" | "inactive"): Promise<Tenant> {
  const resp = await api.patch(`/platform/tenants/${tenantId}/status`, { status });
  return resp.data as Tenant;
}

export async function resetTenantAdminPassword(payload: {
  tenant_id: string;
  admin_email: string;
  new_password: string;
}): Promise<void> {
  await api.post(`/platform/tenants/${payload.tenant_id}/admin-password`, {
    admin_email: payload.admin_email,
    new_password: payload.new_password,
  });
}

export async function updateTenantAdmin(payload: {
  tenant_id: string;
  current_admin_email: string;
  new_admin_email?: string | null;
  new_password?: string | null;
}): Promise<Tenant> {
  const resp = await api.patch(`/platform/tenants/${payload.tenant_id}/admin`, {
    current_admin_email: payload.current_admin_email,
    new_admin_email: payload.new_admin_email ?? null,
    new_password: payload.new_password ?? null,
  });
  return resp.data as Tenant;
}
