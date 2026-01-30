import { api } from "./client";

export type LoginRequest = {
  email: string;
  password: string;
  tenant_subdomain?: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type MeResponse = {
  user_id: string;
  email: string;
  memberships: Array<{
    school_id: string;
    role_id: string;
    school_name: string;
  }>;
  is_platform_admin: boolean;
  tenant_id?: string | null;
};

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const headers = payload.tenant_subdomain
    ? { "X-Tenant-Subdomain": payload.tenant_subdomain }
    : undefined;
  const resp = await api.post(
    "/auth/login",
    { email: payload.email, password: payload.password },
    { headers }
  );
  return resp.data as TokenResponse;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function me(token?: string): Promise<MeResponse> {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const resp = await api.get("/auth/me", { headers });
  return resp.data as MeResponse;
}
