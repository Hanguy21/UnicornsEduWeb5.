import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

const DEFAULT_DAYS = 30;

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class CustomerCareService {
  constructor(private readonly prisma: PrismaService) { }

  /** List students assigned to this staff in customer_care_service, sorted by accountBalance asc. */
  async getStudentsByStaffId(staffId: string) {
    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: staffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const list = await this.prisma.customerCareService.findMany({
      where: { staffId },
      include: {
        student: {
          include: {
            studentClasses: {
              include: {
                class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: {
        student: {
          accountBalance: 'asc',
        },
      },
    });

    const items = list.map((row) => ({
      id: row.student.id,
      fullName: row.student.fullName ?? '',
      accountBalance: row.student.accountBalance ?? 0,
      province: row.student.province ?? null,
      status: row.student.status,
      classes: row.student.studentClasses.map((sc) => ({
        id: sc.class.id,
        name: sc.class.name,
      })),
    }));

    items.sort((a, b) => (a.accountBalance ?? 0) - (b.accountBalance ?? 0));
    return items;
  }

  /** List students with total commission (last 30 days) for this staff. */
  async getCommissionsByStaffId(staffId: string, days: number = DEFAULT_DAYS) {
    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: staffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        customerCareStaffId: staffId,
        session: { date: { gte: since } },
      },
      include: {
        student: { select: { id: true, fullName: true } },
        session: { select: { id: true, date: true } },
      },
    });

    const byStudent = new Map<
      string,
      { studentId: string; fullName: string; totalCommission: number }
    >();

    for (const a of attendances) {
      const tuition = toNumber(a.tuitionFee);
      const coef = toNumber(a.customerCareCoef);
      const commission = Math.round(tuition * coef);
      const existing = byStudent.get(a.studentId);
      if (existing) {
        existing.totalCommission += commission;
      } else {
        byStudent.set(a.studentId, {
          studentId: a.student.id,
          fullName: a.student.fullName ?? '',
          totalCommission: commission,
        });
      }
    }

    return Array.from(byStudent.values());
  }

  /** Session-level commissions for one student under this staff (last N days). */
  async getSessionCommissionsByStudent(
    staffId: string,
    studentId: string,
    days: number = DEFAULT_DAYS,
  ) {
    const staff = await this.prisma.staffInfo.findUnique({
      where: { id: staffId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        customerCareStaffId: staffId,
        studentId,
        session: { date: { gte: since } },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });

    return attendances.map((a) => {
      const tuition = toNumber(a.tuitionFee);
      const coef = toNumber(a.customerCareCoef);
      const commission = Math.round(tuition * coef);
      return {
        sessionId: a.session.id,
        date: a.session.date,
        className: a.session.class?.name ?? null,
        tuitionFee: tuition,
        customerCareCoef: coef,
        commission,
      };
    });
  }
}
