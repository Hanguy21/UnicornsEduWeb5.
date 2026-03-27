import { PaymentStatus, StudentStatus } from 'generated/enums';

export interface CustomerCareStudentClassDto {
  id: string;
  name: string;
}

export interface CustomerCareStudentDto {
  id: string;
  fullName: string;
  accountBalance: number;
  province: string | null;
  status: StudentStatus | null;
  classes: CustomerCareStudentClassDto[];
}

export interface CustomerCareCommissionDto {
  studentId: string;
  fullName: string;
  totalCommission: number;
}

export interface CustomerCareSessionCommissionDto {
  sessionId: string;
  date: string;
  className: string | null;
  tuitionFee: number;
  customerCareCoef: number;
  commission: number;
  paymentStatus: PaymentStatus;
}
