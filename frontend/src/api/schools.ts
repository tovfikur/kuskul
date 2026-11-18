import { api } from "./client";

export type School = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

export type CreateSchoolPayload = {
  name: string;
  code: string;
};

export async function listSchools(): Promise<School[]> {
  const resp = await api.get("/schools");
  return resp.data as School[];
}

export async function createSchool(payload: CreateSchoolPayload): Promise<School> {
  const resp = await api.post("/schools", payload);
  return resp.data as School;
}

export async function deleteSchool(schoolId: string): Promise<void> {
  await api.delete(`/schools/${schoolId}`);
}

export async function activateSchool(schoolId: string): Promise<void> {
  await api.patch(`/schools/${schoolId}/activate`);
}

export async function deactivateSchool(schoolId: string): Promise<void> {
  await api.patch(`/schools/${schoolId}/deactivate`);
}
