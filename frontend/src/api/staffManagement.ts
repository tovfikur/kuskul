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

// ============================================================================
// LEAVE BALANCES
// ============================================================================

export interface LeaveBalance {
  id: string;
  staff_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  pending_days: number;
  carried_forward: number;
  available_days: number;
  created_at: string;
  updated_at?: string;
}

export async function getLeaveBalanceSummary(year?: number) {
  return safeRequest({ method: "GET", url: "/staff/leave/balances/summary", params: { year } });
}

export async function getStaffLeaveBalances(staff_id: string, year?: number) {
  return safeRequest({ method: "GET", url: `/staff/leave/balances/staff/${staff_id}`, params: { year } });
}

// ============================================================================
// LEAVE REQUESTS
// ============================================================================

export interface StaffLeaveRequest {
  id: string;
  staff_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by_user_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
  
  // Extra details joined in frontend or backend
  staff_name?: string;
  leave_type_name?: string;
  leave_type_color?: string;
}

export interface StaffLeaveRequestCreate {
  staff_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export async function listLeaveRequests(params?: {
  page?: number;
  limit?: number;
  status?: string;
  staff_id?: string;
  leave_type_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  return safeRequest({ method: "GET", url: "/staff/leave/requests", params });
}

export async function createLeaveRequest(data: StaffLeaveRequestCreate) {
  return safeRequest({ method: "POST", url: "/staff/leave/requests", data });
}

export async function approveLeaveRequest(id: string) {
  return safeRequest({ method: "PATCH", url: `/staff/leave/requests/${id}/approve`, data: {} });
}

export async function rejectLeaveRequest(id: string, rejection_reason: string) {
  return safeRequest({ method: "PATCH", url: `/staff/leave/requests/${id}/reject`, data: { rejection_reason } });
}

export async function cancelLeaveRequest(id: string) {
  return safeRequest({ method: "DELETE", url: `/staff/leave/requests/${id}` });
}

// ============================================================================
// PAYROLL MANAGEMENT
// ============================================================================

export interface PayrollCycle {
  id: string;
  school_id: string;
  month: number;
  year: number;
  status: "draft" | "processing" | "completed" | "paid";
  total_amount: number;
  processed_by_user_id?: string;
  processed_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PayrollCycleWithStats extends PayrollCycle {
  payslip_count: number;
  paid_count: number;
  pending_count: number;
}

export interface PayrollCycleCreate {
  month: number;
  year: number;
  notes?: string;
}

export interface Payslip {
  id: string;
  payroll_cycle_id: string;
  staff_id: string;
  basic_salary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  payment_date?: string;
  payment_method: string;
  payment_reference?: string;
  status: "generated" | "sent" | "paid";
  working_days: number;
  present_days: number;
  leave_days: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PayslipUpdate {
  basic_salary?: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  working_days?: number;
  present_days?: number;
  leave_days?: number;
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
}

export interface PayslipMarkPaid {
  payment_date: string;
  payment_reference?: string;
}

// --- Cycle Actions ---

export async function listPayrollCycles(params?: {
  page?: number;
  limit?: number;
  year?: number;
  status?: string;
}) {
  return safeRequest({ method: "GET", url: "/staff/payroll/cycles", params });
}

export async function createPayrollCycle(data: PayrollCycleCreate) {
  return safeRequest({ method: "POST", url: "/staff/payroll/cycles", data });
}

export async function getPayrollCycle(id: string) {
  return safeRequest({ method: "GET", url: `/staff/payroll/cycles/${id}` });
}

export async function processPayrollCycle(id: string, payload: { auto_generate_payslips: boolean; include_inactive_staff: boolean }) {
  return safeRequest({ method: "PATCH", url: `/staff/payroll/cycles/${id}/process`, data: payload });
}

export async function approvePayrollCycle(id: string) {
  return safeRequest({ method: "PATCH", url: `/staff/payroll/cycles/${id}/approve` });
}

export async function completePayrollCycle(id: string) {
  return safeRequest({ method: "PATCH", url: `/staff/payroll/cycles/${id}/complete` });
}

// --- Payslip Actions ---

export async function getCyclePayslips(cycleId: string, params?: { page?: number; limit?: number }) {
  return safeRequest({ method: "GET", url: `/staff/payroll/cycles/${cycleId}/payslips`, params });
}

export async function sendPayslips(cycleId: string, staffIds?: string[]) {
  return safeRequest({ method: "POST", url: `/staff/payroll/cycles/${cycleId}/send-payslips`, data: { staff_ids: staffIds } });
}

export async function getPayslip(id: string) {
  return safeRequest({ method: "GET", url: `/staff/payroll/payslips/${id}` });
}

export async function updatePayslip(id: string, data: PayslipUpdate) {
  return safeRequest({ method: "PUT", url: `/staff/payroll/payslips/${id}`, data });
}

export async function markPayslipPaid(id: string, data: PayslipMarkPaid) {
  return safeRequest({ method: "PATCH", url: `/staff/payroll/payslips/${id}/mark-paid`, data });
}
