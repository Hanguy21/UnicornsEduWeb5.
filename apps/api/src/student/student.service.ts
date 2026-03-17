import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender, StudentStatus } from 'generated/enums';
import { Prisma } from '../../generated/client';
import {
  CreateStudentDto,
  StudentListQueryDto,
  UpdateStudentBodyDto,
  UpdateStudentDto,
} from 'src/dtos/student.dto';
import { PrismaService } from 'src/prisma/prisma.service';

type StudentWithClasses = Prisma.StudentInfoGetPayload<{
  include: {
    studentClasses: {
      include: {
        class: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeStudentListItem(student: StudentWithClasses) {
    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      school: student.school,
      province: student.province,
      status: student.status,
      gender: student.gender,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      studentClasses: student.studentClasses.map((studentClass) => ({
        class: {
          id: studentClass.class.id,
          name: studentClass.class.name,
        },
      })),
    };
  }

  private serializeStudentDetail(student: StudentWithClasses) {
    return {
      ...this.serializeStudentListItem(student),
      birthYear: student.birthYear,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      goal: student.goal,
      dropOutDate: student.dropOutDate,
    };
  }

  private buildUpdateData(dto: UpdateStudentBodyDto) {
    const data: Record<string, unknown> = {};

    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.school !== undefined) data.school = dto.school;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.birth_year !== undefined) data.birthYear = dto.birth_year;
    if (dto.parent_name !== undefined) data.parentName = dto.parent_name;
    if (dto.parent_phone !== undefined) data.parentPhone = dto.parent_phone;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.goal !== undefined) data.goal = dto.goal;

    if (dto.drop_out_date !== undefined) {
      const date = new Date(dto.drop_out_date);
      data.dropOutDate = Number.isNaN(date.getTime()) ? undefined : date;
    }

    return data as Parameters<typeof this.prisma.studentInfo.update>[0]['data'];
  }

  async getStudents(query: StudentListQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;

    const trimmedSearch = query.search?.trim();
    const trimmedSchool = query.school?.trim();
    const trimmedProvince = query.province?.trim();
    const trimmedClassName = query.className?.trim();
    const normalizedStatus = query.status?.trim();
    const normalizedGender = query.gender?.trim();

    const statusFilter: StudentStatus | undefined =
      normalizedStatus === StudentStatus.active
        ? StudentStatus.active
        : normalizedStatus === StudentStatus.inactive
          ? StudentStatus.inactive
          : undefined;

    const genderFilter: Gender | undefined =
      normalizedGender === Gender.male
        ? Gender.male
        : normalizedGender === Gender.female
          ? Gender.female
          : undefined;

    const where: Prisma.StudentInfoWhereInput = {
      ...(trimmedSearch
        ? {
            fullName: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedSchool
        ? {
            school: {
              contains: trimmedSchool,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(trimmedProvince
        ? {
            province: {
              contains: trimmedProvince,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(genderFilter ? { gender: genderFilter } : {}),
      ...(trimmedClassName
        ? {
            studentClasses: {
              some: {
                class: {
                  name: {
                    contains: trimmedClassName,
                    mode: 'insensitive' as const,
                  },
                },
              },
            },
          }
        : {}),
    };

    const total = await this.prisma.studentInfo.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    const data = await this.prisma.studentInfo.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
      include: {
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      data: data.map((student) => this.serializeStudentListItem(student)),
      meta: {
        total,
        page: safePage,
        limit,
      },
    };
  }

  async getStudentById(id: string) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
      include: {
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.serializeStudentDetail(student);
  }

  async updateStudentById(id: string, dto: UpdateStudentBodyDto) {
    const student = await this.prisma.studentInfo.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const updateData = this.buildUpdateData(dto);
    if (Object.keys(updateData).length === 0) {
      return this.getStudentById(id);
    }

    const updated = await this.prisma.studentInfo.update({
      where: { id },
      data: updateData,
      include: {
        studentClasses: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return this.serializeStudentDetail(updated);
  }

  async updateStudent(data: UpdateStudentDto) {
    return this.updateStudentById(data.id, data);
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
