export type SessionPaymentStatus = "paid" | "unpaid" | string;

export interface SessionClassRef {
  id: string;
  name: string;
}

export interface SessionTeacherRef {
  id: string;
  fullName?: string | null;
}

export interface SessionMonthYearParams {
  month: string;
  year: string;
}

export interface SessionItem {
  id: string;
  classId: string;
  teacherId: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  teacherPaymentStatus?: SessionPaymentStatus | null;
  allowanceAmount?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  class?: SessionClassRef | null;
  teacher?: SessionTeacherRef | null;
}
