import { api } from './http'

export type LoginRequest = {
  email: string
  password: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
}

export type MeResponse = {
  user_id: string
  email: string
  memberships: Array<{ school_id: string; role_id: string }>
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const resp = await api.post('/auth/login', payload)
  return resp.data as TokenResponse
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function me(): Promise<MeResponse> {
  const resp = await api.get('/auth/me')
  return resp.data as MeResponse
}

