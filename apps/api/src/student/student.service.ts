import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateStudentDto, UpdateStudentDto } from 'src/dtos/student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudents(query: PaginationQueryDto & { search?: string }) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const skip = (page - 1) * limit;
    const trimmedSearch = query.search?.trim();

    const where = trimmedSearch
      ? {
          fullName: {
            contains: trimmedSearch,
            mode: 'insensitive' as const,
          },
        }
      : undefined;

    return await this.prisma.studentInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentById(id: string) {
    return await this.prisma.studentInfo.findUnique({
      where: {
        id,
      },
    });
  }

  async updateStudent(data: UpdateStudentDto) {
    const student = await this.prisma.studentInfo.findUnique({
      where: {
        id: data.id,
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return await this.prisma.studentInfo.update({
      where: {
        id: data.id,
      },
      data: {
        fullName: data.full_name,
        email: data.email,
        school: data.school,
        province: data.province,
        birthYear: data.birth_year,
        parentName: data.parent_name,
        parentPhone: data.parent_phone,
        status: data.status,
        gender: data.gender,
        goal: data.goal,
      },
    });
  }

  async deleteStudent(id: string) {
    return await this.prisma.studentInfo.delete({
      where: {
        id,
      },
    });
  }

  async createStudent(data: CreateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: data.user_id,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return await this.prisma.studentInfo.create({
      data: {
        fullName: data.full_name,
        email: data.email,
        school: data.school,
        province: data.province,
        birthYear: data.birth_year,
        parentName: data.parent_name,
        parentPhone: data.parent_phone,
        status: data.status,
        gender: data.gender,
        goal: data.goal,
        userId: data.user_id,
      },
    });
  }
}
