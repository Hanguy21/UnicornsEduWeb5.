import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'generated/enums';
import {
  UpdateMyProfileDto,
  UpdateMyStaffProfileDto,
  UpdateMyStudentProfileDto,
} from 'src/dtos/profile.dto';
import { PaginationQueryDto } from 'src/dtos/pagination.dto';
import { CreateUserDto, UpdateUserDto } from 'src/dtos/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser<
    T extends { passwordHash: string | null; refreshToken: string | null },
  >(user: T) {
    const { passwordHash, refreshToken, ...safeUser } = user;
    return safeUser;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private isNotFoundError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    );
  }

  async getUsers(query: PaginationQueryDto) {
    const parsedPage = Number(query.page);
    const parsedLimit = Number(query.limit);
    const page =
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
    const limit =
      Number.isInteger(parsedLimit) && parsedLimit >= 1
        ? Math.min(parsedLimit, 100)
        : 20;
    const skip = (page - 1) * limit;

    const users = await this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async createUser(data: CreateUserDto) {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash: await bcrypt.hash(data.password, 10),
          first_name: data.first_name,
          last_name: data.last_name,
          roleType: UserRole.guest,
          province: data.province,
          accountHandle: data.accountHandle,
        },
      });

      return this.sanitizeUser(createdUser);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email or account handle already exists');
      }

      throw error;
    }
  }

  async updateUser(data: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: data.id },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData = {
      email: data.email,
      phone: data.phone,
      name: data.name,
      roleType: data.roleType,
      status: data.status,
      linkId: data.linkId,
      province: data.province,
      accountHandle: data.accountHandle,
      emailVerified: data.emailVerified,
      phoneVerified: data.phoneVerified,
    };

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: data.id },
        data: updateData,
      });

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email or account handle already exists');
      }

      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        staffInfo: { select: { id: true } },
        studentInfo: { select: { id: true } },
        _count: { select: { actionHistories: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.staffInfo || user.studentInfo || user._count.actionHistories > 0) {
      throw new BadRequestException(
        'User is linked to staff, student, or action histories',
      );
    }

    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
      });

      return this.sanitizeUser(deletedUser);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException('User not found');
      }

      throw error;
    }
  }

  /** Get full profile (user + staffInfo + studentInfo) for current user. */
  async getFullProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staffInfo: true,
        studentInfo: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  /** Update current user's basic info (self). */
  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) {
      throw new UnauthorizedException('User not found');
    }
    const data: Record<string, unknown> = {};
    if (dto.first_name !== undefined) data.first_name = dto.first_name;
    if (dto.last_name !== undefined) data.last_name = dto.last_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.province !== undefined) data.province = dto.province;
    if (dto.accountHandle !== undefined) data.accountHandle = dto.accountHandle;
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: data as Parameters<typeof this.prisma.user.update>[0]['data'],
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Email hoặc account handle đã tồn tại');
      }
      throw error;
    }
    return this.getFullProfile(userId);
  }

  /** Update current user's staff record (self). */
  async updateMyStaffProfile(userId: string, dto: UpdateMyStaffProfileDto) {
    const staff = await this.prisma.staffInfo.findFirst({
      where: { userId },
    });
    if (!staff) {
      throw new BadRequestException('User has no linked staff record');
    }
    const data: Record<string, unknown> = {};
    if (dto.full_name !== undefined) data.fullName = dto.full_name;
    if (dto.birth_date !== undefined) {
      const d = new Date(dto.birth_date);
      data.birthDate = Number.isNaN(d.getTime()) ? undefined : d;
    }
    if (dto.university !== undefined) data.university = dto.university;
    if (dto.high_school !== undefined) data.highSchool = dto.high_school;
    if (dto.specialization !== undefined)
      data.specialization = dto.specialization;
    if (dto.bank_account !== undefined) data.bankAccount = dto.bank_account;
    if (dto.bank_qr_link !== undefined) data.bankQrLink = dto.bank_qr_link;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.roles !== undefined) data.roles = dto.roles;
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    await this.prisma.staffInfo.update({
      where: { id: staff.id },
      data: data as Parameters<typeof this.prisma.staffInfo.update>[0]['data'],
    });
    return this.getFullProfile(userId);
  }

  /** Update current user's student record (self). */
  async updateMyStudentProfile(userId: string, dto: UpdateMyStudentProfileDto) {
    const student = await this.prisma.studentInfo.findFirst({
      where: { userId },
    });
    if (!student) {
      throw new BadRequestException('User has no linked student record');
    }
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
    if (Object.keys(data).length === 0) {
      return this.getFullProfile(userId);
    }
    await this.prisma.studentInfo.update({
      where: { id: student.id },
      data: data as Parameters<
        typeof this.prisma.studentInfo.update
      >[0]['data'],
    });
    return this.getFullProfile(userId);
  }
}
