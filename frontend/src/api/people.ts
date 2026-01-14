import { api } from "./client";

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  email?: string;
  phone?: string;
  is_active: boolean;
}

export interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  job_title?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export async function getStudents(
  page = 1,
  limit = 100
): Promise<{ items: Student[]; total: number }> {
  const resp = await api.get("/students", {
    params: { skip: (page - 1) * limit, limit },
  });
  return resp.data;
}

export async function getStaff(
  page = 1,
  limit = 100
): Promise<{ items: Staff[]; total: number }> {
  const resp = await api.get("/staff", {
    params: { skip: (page - 1) * limit, limit },
  });
  return resp.data;
}

export async function getUsers(
  page = 1,
  limit = 100
): Promise<{ items: User[]; total: number }> {
  const resp = await api.get("/users", {
    params: { skip: (page - 1) * limit, limit },
  });
  return resp.data;
}
