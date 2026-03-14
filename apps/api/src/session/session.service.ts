import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionCreateDto } from 'src/dtos/session.dto';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(data: SessionCreateDto) {
    const session = await this.prisma.session.create({
      data: data,
    });

    return session;
  }

  private buildMonthRange(month: string, year: string) {
    const monthValue = Number.parseInt(month, 10);
    const yearValue = Number.parseInt(year, 10);

    const isInvalidMonth =
      !Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12;
    const isInvalidYear =
      !Number.isInteger(yearValue) || yearValue < 1970 || yearValue > 2100;

    if (isInvalidMonth || isInvalidYear) {
      throw new BadRequestException('month/year không hợp lệ.');
    }

    const monthIndex = monthValue - 1;
    const start = new Date(yearValue, monthIndex, 1);
    const end = new Date(yearValue, monthIndex + 1, 1);

    return {
      start,
      end,
    };
  }

  async getSessionsByClassId(classId: string, month: string, year: string) {
    const range = this.buildMonthRange(month, year);

    const sessions = await this.prisma.session.findMany({
      where: {
        classId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        teacher: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions;
  }

  async getSessionsByTeacherId(teacherId: string, month: string, year: string) {
    const range = this.buildMonthRange(month, year);

    const sessions = await this.prisma.session.findMany({
      where: {
        teacherId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        class: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sessions;
  }
}
