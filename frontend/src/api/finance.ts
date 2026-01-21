import { api } from "./client";

export type FeeStructure = {
  id: string;
  academic_year_id: string;
  class_id: string;
  name: string;
  amount: number;
  due_date: string | null;
};

export type FeePayment = {
  id: string;
  student_id: string;
  academic_year_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  is_refund: boolean;
};

export type FeeDue = {
  id: string;
  student_id: string;
  academic_year_id: string;
  total_fee: number;
  discount_amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
  last_calculated_date: string;
};

export type Discount = {
  id: string;
  school_id: string;
  name: string;
  discount_type: "percent" | "fixed";
  value: number;
  description: string | null;
};

export type FeeStats = {
  due: number;
  paid: number;
};

export type CollectionSummary = {
  collected: number;
  refunded: number;
  net: number;
};

export async function getFeeStructures(params?: {
  academic_year_id?: string;
  class_id?: string;
}): Promise<FeeStructure[]> {
  const resp = await api.get("/fee-structures", { params });
  return resp.data as FeeStructure[];
}

export async function createFeeStructure(payload: {
  academic_year_id: string;
  class_id: string;
  name: string;
  amount: number;
  due_date?: string | null;
}): Promise<FeeStructure> {
  const resp = await api.post("/fee-structures", payload);
  return resp.data as FeeStructure;
}

export async function updateFeeStructure(
  structureId: string,
  payload: { name?: string; amount?: number; due_date?: string | null },
): Promise<FeeStructure> {
  const resp = await api.put(`/fee-structures/${structureId}`, payload);
  return resp.data as FeeStructure;
}

export async function deleteFeeStructure(structureId: string): Promise<void> {
  await api.delete(`/fee-structures/${structureId}`);
}

export async function getFeeDues(params?: {
  academic_year_id?: string;
  class_id?: string;
  status?: string;
}): Promise<FeeDue[]> {
  const resp = await api.get("/fee-dues", { params });
  return resp.data as FeeDue[];
}

export async function getFeeDefaulters(params?: { academic_year_id?: string }): Promise<FeeDue[]> {
  const resp = await api.get("/fee-dues/defaulters", { params });
  return resp.data as FeeDue[];
}

export async function getFeeStats(params?: { academic_year_id?: string }): Promise<FeeStats> {
  const resp = await api.get("/fee-dues/statistics", { params });
  return resp.data as FeeStats;
}

export async function calculateDues(params?: {
  academic_year_id?: string;
}): Promise<{ updated: number }> {
  const resp = await api.post("/fee-dues/calculate", null, { params });
  return resp.data as { updated: number };
}

export async function getFeePayments(params?: {
  student_id?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
}): Promise<FeePayment[]> {
  const resp = await api.get("/fee-payments", { params });
  return resp.data as FeePayment[];
}

export async function collectFee(payload: {
  student_id: string;
  academic_year_id: string;
  payment_date: string;
  amount: number;
  payment_method?: string | null;
  reference?: string | null;
}): Promise<FeePayment> {
  const resp = await api.post("/fee-payments/collect", payload);
  return resp.data as FeePayment;
}

export async function refundFee(paymentId: string): Promise<void> {
  await api.post(`/fee-payments/refund/${paymentId}`);
}

export async function downloadReceipt(paymentId: string): Promise<Blob> {
  const resp = await api.get(`/fee-payments/receipt/${paymentId}`, {
    responseType: "blob",
  });
  return resp.data as Blob;
}

export async function getDiscounts(): Promise<Discount[]> {
  const resp = await api.get("/discounts");
  return resp.data as Discount[];
}

export async function createDiscount(payload: {
  name: string;
  discount_type: "percent" | "fixed";
  value: number;
  description?: string | null;
}): Promise<Discount> {
  const resp = await api.post("/discounts", payload);
  return resp.data as Discount;
}

export async function updateDiscount(
  discountId: string,
  payload: {
    name?: string;
    discount_type?: "percent" | "fixed";
    value?: number;
    description?: string | null;
  },
): Promise<Discount> {
  const resp = await api.put(`/discounts/${discountId}`, payload);
  return resp.data as Discount;
}

export async function deleteDiscount(discountId: string): Promise<void> {
  await api.delete(`/discounts/${discountId}`);
}

export async function applyDiscount(payload: {
  student_id: string;
  discount_id: string;
}): Promise<void> {
  await api.post("/discounts/apply", payload);
}

export async function removeAllDiscountsForStudent(studentId: string): Promise<void> {
  await api.delete(`/discounts/remove/${studentId}`);
}

export async function getCollectionSummary(params: {
  start_date: string;
  end_date: string;
}): Promise<CollectionSummary> {
  const resp = await api.get("/reports/financial/collection-summary", {
    params,
  });
  return resp.data as CollectionSummary;
}

export async function getDueList(params?: {
  class_id?: string;
}): Promise<Array<{ student_id: string; academic_year_id: string; due_amount: number; status: string }>> {
  const resp = await api.get("/reports/financial/due-list", { params });
  return resp.data as Array<{
    student_id: string;
    academic_year_id: string;
    due_amount: number;
    status: string;
  }>;
}

export async function getPaymentHistory(params?: {
  student_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Array<{ id: string; student_id: string; date: string; amount: number; refund: boolean }>> {
  const resp = await api.get("/reports/financial/payment-history", { params });
  return resp.data as Array<{
    id: string;
    student_id: string;
    date: string;
    amount: number;
    refund: boolean;
  }>;
}

export async function getClassWiseCollection(params: {
  academic_year_id: string;
}): Promise<Array<{ class_id: string; collected: number }>> {
  const resp = await api.get("/reports/financial/class-wise-collection", { params });
  return resp.data as Array<{ class_id: string; collected: number }>;
}
