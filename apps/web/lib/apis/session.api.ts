import { SessionItem, SessionMonthYearParams } from "@/dtos/session.dto";
import { api } from "../client";

export async function getSessionsByClassId(
  classId: string,
  params: SessionMonthYearParams,
): Promise<SessionItem[]> {
  const safeId = encodeURIComponent(classId);
  const response = await api.get(`/sessions/class/${safeId}`, {
    params,
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : [];
}

export async function getSessionsByStaffId(
  staffId: string,
  params: SessionMonthYearParams,
): Promise<SessionItem[]> {
  const safeId = encodeURIComponent(staffId);
  const response = await api.get(`/sessions/staff/${safeId}`, {
    params,
  });
  const payload = response.data;
  return Array.isArray(payload) ? payload : [];
}
