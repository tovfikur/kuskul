import { safeRequest } from "./httpSafe";

// ============================================================================
// DEPARTMENTS
// ============================================================================

export interface Department {
  id: string;
  school_id: string;
  name: string;
  code: string;
  head_staff_id?: string;
  budget_allocated?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DepartmentCreate {
  name: string;
  code: string;
  head_staff_id?: string;
  budget_allocated?: number;
  description?: string;
  is_active?: boolean;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
  head_staff_id?: string;
  budget_allocated?: number;
  description?: string;
  is_active?: boolean;
}

export async function listDepartments(params?: {
  page?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
}) {
  return safeRequest({ method: "GET", url: "/staff/departments", params });
}

export async function createDepartment(data: DepartmentCreate) {
  return safeRequest({ method: "POST", url: "/staff/departments", data });
}

export async function updateDepartment(id: string, data: DepartmentUpdate) {
  return safeRequest({ method: "PUT", url: `/staff/departments/${id}`, data });
}

export async function deleteDepartment(id: string) {
  return safeRequest({ method: "DELETE", url: `/staff/departments/${id}` });
}

// ============================================================================
// DESIGNATIONS
// ============================================================================

export interface Designation {
  id: string;
  school_id: string;
  title: string;
  code: string;
  level: number;
  department_id?: string;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DesignationCreate {
  title: string;
  code: string;
  level?: number;
  department_id?: string;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  is_active?: boolean;
}

export interface DesignationUpdate {
  title?: string;
  code?: string;
  level?: number;
  department_id?: string;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  is_active?: boolean;
}

export async function listDesignations(params?: {
  page?: number;
  limit?: number;
  department_id?: string;
  is_active?: boolean;
  search?: string;
}) {
  return safeRequest({ method: "GET", url: "/staff/designations", params });
}

export async function createDesignation(data: DesignationCreate) {
  return safeRequest({ method: "POST", url: "/staff/designations", data });
}

export async function updateDesignation(id: string, data: DesignationUpdate) {
  return safeRequest({ method: "PUT", url: `/staff/designations/${id}`, data });
}

export async function deleteDesignation(id: string) {
  return safeRequest({ method: "DELETE", url: `/staff/designations/${id}` });
}

// ============================================================================
// LEAVE TYPES
// ============================================================================

export interface LeaveType {
  id: string;
  school_id: string;
  name: string;
  code: string;
  days_per_year: number;
  requires_approval: boolean;
  max_consecutive_days?: number;
  is_paid: boolean;
  color: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LeaveTypeCreate {
  name: string;
  code: string;
  days_per_year: number;
  requires_approval?: boolean;
  max_consecutive_days?: number;
  is_paid?: boolean;
  color?: string;
  description?: string;
  is_active?: boolean;
}

export interface LeaveTypeUpdate {
  name?: string;
  code?: string;
  days_per_year?: number;
  requires_approval?: boolean;
  max_consecutive_days?: number;
  is_paid?: boolean;
  color?: string;
  description?: string;
  is_active?: boolean;
}

export async function listLeaveTypes(params?: {
  is_active?: boolean;
}) {
  return safeRequest({ method: "GET", url: "/staff/leave/types", params });
}

export async function createLeaveType(data: LeaveTypeCreate) {
  return safeRequest({ method: "POST", url: "/staff/leave/types", data });
}

export async function updateLeaveType(id: string, data: LeaveTypeUpdate) {
  return safeRequest({ method: "PUT", url: `/staff/leave/types/${id}`, data });
}

export async function deleteLeaveType(id: string) {
  return safeRequest({ method: "DELETE", url: `/staff/leave/types/${id}` });
}

// ============================================================================
// STAFF
// ============================================================================

export interface Staff {
  id: string;
  school_id: string;
  user_id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  date_of_joining?: string;
  status: string;
  profile_photo_url?: string;
  
  // Personal
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  religion?: string;

  // Address
  address?: string; // Backend field
  present_address?: string; // Mapped
  permanent_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Emergency
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  // Employment
  employment_type?: string;

  // Qualifications
  highest_qualification?: string;
  specialization?: string;
  experience_years?: number;

  // Bank
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;

  created_at: string;
  updated_at?: string;
}

export interface StaffCreate {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  date_of_joining?: string;
  status?: string;
  
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  religion?: string;

  present_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  employment_type?: string;

  highest_qualification?: string;
  specialization?: string;
  experience_years?: number;

  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;

  profile_photo_url?: string;
}

export interface StaffUpdate {
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  date_of_joining?: string;
  status?: string;
  
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  nationality?: string;
  marital_status?: string;
  religion?: string;

  present_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;

  employment_type?: string;

  highest_qualification?: string;
  specialization?: string;
  experience_years?: number;

  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;

  profile_photo_url?: string;
}

export async function listStaff(params?: {
  page?: number;
  limit?: number;
  designation?: string;
  department?: string;
  search?: string;
  status?: string;
}) {
  return safeRequest({ method: "GET", url: "/staff", params });
}

export async function getStaff(id: string) {
  return safeRequest({ method: "GET", url: `/staff/${id}` });
}

export async function createStaff(data: StaffCreate) {
  return safeRequest({ method: "POST", url: "/staff", data });
}

export async function updateStaff(id: string, data: StaffUpdate) {
  return safeRequest({ method: "PUT", url: `/staff/${id}`, data });
}

export async function deleteStaff(id: string) {
  return safeRequest({ method: "DELETE", url: `/staff/${id}` });
}

// ============================================================================
// STAFF ATTENDANCE
// ============================================================================

export interface StaffAttendance {
  id: string;
  attendance_date: string;
  staff_id: string;
  status: "present" | "absent" | "late" | "half_day" | "on_leave";
  check_in_at?: string;
  check_out_at?: string;
  method?: string;
  device_id?: string;
}

export interface MarkStaffAttendanceRequest {
  attendance_date: string;
  items: {
    staff_id: string;
    status: string;
  }[];
}

export async function getStaffAttendanceByDate(date: string) {
  return safeRequest({ method: "GET", url: `/attendance/staff/date/${date}` }); // FIXED: Corrected path
}

export async function markStaffAttendance(data: MarkStaffAttendanceRequest) {
  return safeRequest({ method: "POST", url: "/attendance/staff/mark", data });
}

export async function staffCheckIn(staff_id: string, method: string = "manual") {
  return safeRequest({ method: "POST", url: "/attendance/staff/check-in", data: { staff_id, method } });
}

export async function staffCheckOut(staff_id: string, method: string = "manual") {
  return safeRequest({ method: "POST", url: "/attendance/staff/check-out", data: { staff_id, method } });
}
