import { safeRequest } from "./httpSafe";

export type TransportVehicle = {
  id: string;
  school_id: string;
  name: string;
  registration_no: string | null;
  capacity: number;
  driver_name: string | null;
  status: string;
};

export type TransportRoute = {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
};

export type TransportRouteStop = {
  id: string;
  route_id: string;
  name: string;
  sequence: number;
  pickup_time: string | null;
  drop_time: string | null;
};

export type StudentTransportAssignment = {
  id: string;
  school_id: string;
  student_id: string;
  route_id: string;
  stop_id: string | null;
  vehicle_id: string | null;
  status: string;
};

export async function getTransportVehicles(params?: { status?: string }): Promise<TransportVehicle[]> {
  const r = await safeRequest<TransportVehicle[]>({
    method: "get",
    url: "/transport/vehicles",
    params,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

export async function createTransportVehicle(payload: {
  name: string;
  registration_no?: string | null;
  capacity: number;
  driver_name?: string | null;
  status: string;
}): Promise<TransportVehicle> {
  const r = await safeRequest<TransportVehicle>({
    method: "post",
    url: "/transport/vehicles",
    data: payload,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

export async function getTransportRoutes(): Promise<TransportRoute[]> {
  const r = await safeRequest<TransportRoute[]>({ method: "get", url: "/transport/routes" });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

export async function createTransportRoute(payload: {
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
}): Promise<TransportRoute> {
  const r = await safeRequest<TransportRoute>({
    method: "post",
    url: "/transport/routes",
    data: payload,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

export async function getRouteStops(routeId: string): Promise<TransportRouteStop[]> {
  const r = await safeRequest<TransportRouteStop[]>({
    method: "get",
    url: `/transport/routes/${routeId}/stops`,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

export async function getTransportAssignments(params?: {
  route_id?: string;
  vehicle_id?: string;
}): Promise<StudentTransportAssignment[]> {
  const r = await safeRequest<StudentTransportAssignment[]>({
    method: "get",
    url: "/transport/student-assignments",
    params,
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.data;
}

