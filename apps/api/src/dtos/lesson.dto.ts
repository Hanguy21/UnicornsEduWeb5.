import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StaffRole, StaffStatus } from 'generated/enums';
import { LessonTaskPriority, LessonTaskStatus } from 'generated/enums';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsDateString,
  IsEnum,
  Max,
  Min,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export interface LessonListMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LessonOverviewSummaryDto {
  resourceCount: number;
  taskCount: number;
  openTaskCount: number;
  completedTaskCount: number;
}

export interface LessonResourceResponseDto {
  id: string;
  title: string | null;
  description: string | null;
  resourceLink: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonTaskCreatorDto {
  id: string;
  fullName: string;
  roles: StaffRole[];
  status: StaffStatus;
}

export interface LessonTaskAssigneeDto {
  id: string;
  fullName: string;
  roles: StaffRole[];
  status: StaffStatus;
}

export interface LessonTaskStaffOptionDto {
  id: string;
  fullName: string;
  roles: StaffRole[];
  status: StaffStatus;
}

export interface LessonTaskResponseDto {
  id: string;
  title: string | null;
  description: string | null;
  status: LessonTaskStatus;
  priority: LessonTaskPriority;
  dueDate: string | null;
  createdByStaff: LessonTaskCreatorDto | null;
  assignees: LessonTaskAssigneeDto[];
}

export interface LessonOverviewResponseDto {
  summary: LessonOverviewSummaryDto;
  resources: LessonResourceResponseDto[];
  resourcesMeta: LessonListMetaDto;
  tasks: LessonTaskResponseDto[];
  tasksMeta: LessonListMetaDto;
}

export class LessonOverviewQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  resourcePage?: number;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 100, default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  resourceLimit?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  taskPage?: number;

  @ApiPropertyOptional({ example: 6, minimum: 1, maximum: 100, default: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  taskLimit?: number;
}

export class LessonTaskStaffOptionsQueryDto {
  @ApiPropertyOptional({
    example: 'Nguyen',
    description: 'Search by staff full name.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 3, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  limit?: number;
}

export class CreateLessonResourceDto {
  @ApiProperty({ example: 'Bộ note đại số tổ hợp' })
  @Type(() => String)
  @IsString()
  title: string;

  @ApiProperty({ example: 'https://example.com/lesson-note' })
  @Type(() => String)
  @IsString()
  @IsUrl({
    require_protocol: true,
    require_tld: true,
  })
  resourceLink: string;

  @ApiPropertyOptional({
    example: 'Tài liệu nền cho buổi mở đầu của cụm chuyên đề.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['đại số', 'mở đầu', 'lecture-note'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;
}

export class UpdateLessonResourceDto extends PartialType(
  CreateLessonResourceDto,
) {}

export class CreateLessonTaskDto {
  @ApiProperty({ example: 'Soạn outline buổi 1' })
  @Type(() => String)
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Chốt mục tiêu, ví dụ mở bài, và checklist slide chính.',
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: LessonTaskStatus,
    default: LessonTaskStatus.pending,
  })
  @IsOptional()
  @IsEnum(LessonTaskStatus)
  status?: LessonTaskStatus;

  @ApiPropertyOptional({
    enum: LessonTaskPriority,
    default: LessonTaskPriority.medium,
  })
  @IsOptional()
  @IsEnum(LessonTaskPriority)
  priority?: LessonTaskPriority;

  @ApiPropertyOptional({
    example: '2026-03-24',
    description: 'Date-only string in YYYY-MM-DD format.',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional({
    example: '99e2effd-fab2-42e1-8b17-43c0d840e1be',
    description:
      'Staff id assigned as the responsible owner of this lesson task.',
  })
  @IsOptional()
  @IsUUID('4')
  createdByStaffId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['99e2effd-fab2-42e1-8b17-43c0d840e1be'],
    description: 'Assigned staff ids for this lesson task.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  assignedStaffIds?: string[] | null;
}

export class UpdateLessonTaskDto extends PartialType(CreateLessonTaskDto) {}
