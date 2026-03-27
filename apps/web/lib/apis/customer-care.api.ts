import type {
  CustomerCarePaymentStatus,
  CustomerCareStudentItem,
  CustomerCareCommissionItem,
  CustomerCareSessionCommissionItem,
} from "@/dtos/customer-care.dto";
import { api } from "../client";

function normalizeCustomerCarePaymentStatus(
  value: string | null | undefined,
): CustomerCarePaymentStatus {
  return value === "paid" ? "paid" : "pending";
}

export async function getCustomerCareStudents(
  staffId: string
): Promise<CustomerCareStudentItem[]> {
  const res = await api.get<CustomerCareStudentItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students`
  );
  return res.data;
}

export async function getCustomerCareCommissions(
  staffId: string,
  days?: number
): Promise<CustomerCareCommissionItem[]> {
  const params = days != null ? { days } : {};
  const res = await api.get<CustomerCareCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/commissions`,
    { params }
  );
  return res.data;
}

export async function getCustomerCareSessionCommissions(
  staffId: string,
  studentId: string,
  days?: number
): Promise<CustomerCareSessionCommissionItem[]> {
  const params = days != null ? { days } : {};
  const res = await api.get<CustomerCareSessionCommissionItem[]>(
    `/customer-care/staff/${encodeURIComponent(staffId)}/students/${encodeURIComponent(studentId)}/session-commissions`,
    { params }
  );
  return res.data.map((item) => ({
    ...item,
    paymentStatus: normalizeCustomerCarePaymentStatus(item.paymentStatus),
  }));
}
