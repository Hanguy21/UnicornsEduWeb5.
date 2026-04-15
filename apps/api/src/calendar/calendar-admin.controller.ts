import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffRole, UserRole } from 'generated/enums';
import { AllowStaffRolesOnAdminRoutes } from '../auth/decorators/allow-staff-roles-on-admin.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService } from './calendar.service';
import {
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
  ClassSchedulePatternDto,
} from '../dtos/class-schedule.dto';

@Controller('admin/calendar')
@ApiTags('calendar-admin')
@ApiCookieAuth('access_token')
@AllowStaffRolesOnAdminRoutes(StaffRole.assistant)
@Roles(UserRole.admin)
export class CalendarAdminController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('class-schedule')
  @ApiOperation({
    summary: 'Lấy các occurrence của class schedule pattern trong khoảng ngày',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách class schedule occurrences',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ClassScheduleEventDto' },
        },
        total: { type: 'number', example: 8 },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 8 },
          },
        },
      },
    },
  })
  async getClassScheduleEvents(
    @Query() filters: ClassScheduleFilterDto,
  ): Promise<{
    success: boolean;
    data: ClassScheduleEventDto[];
    total: number;
    meta: { total: number };
  }> {
    const result = await this.calendarService.getClassScheduleEvents(filters);
    return {
      ...result,
      meta: { total: result.total },
    };
  }

  @Get('classes/:classId/schedule')
  @ApiOperation({ summary: 'Lấy weekly schedule pattern của một lớp' })
  @ApiParam({ name: 'classId', description: 'Class ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Lịch học định kỳ của lớp',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({ status: 404, description: 'Class không tồn tại' })
  async getClassSchedulePattern(
    @Param('classId', new ParseUUIDPipe()) classId: string,
  ) {
    return this.calendarService.getClassSchedulePattern(classId);
  }

  @Put('classes/:classId/schedule')
  @ApiOperation({ summary: 'Cập nhật weekly schedule pattern của một lớp' })
  @ApiParam({ name: 'classId', description: 'Class ID (UUID)' })
  @ApiBody({
    description: 'Weekly schedule pattern payload',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Lịch học định kỳ đã được cập nhật',
    type: ClassSchedulePatternDto,
  })
  @ApiResponse({ status: 404, description: 'Class không tồn tại' })
  async updateClassSchedulePattern(
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Body() dto: ClassSchedulePatternDto,
  ) {
    return this.calendarService.updateClassSchedulePattern(
      classId,
      dto.schedule,
    );
  }
}
