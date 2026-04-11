import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'generated/enums';
import { CurrentUser, type JwtPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService, type CalendarEvent } from './calendar.service';
import {
  CalendarEventResponseDto,
  CalendarSessionUpdateDto,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import { BulkSyncDto } from '../dtos/bulk-sync.dto';

@Controller('calendar/events')
@ApiTags('calendar-events')
@ApiCookieAuth('access_token')
@Roles(UserRole.admin)
export class CalendarEventsController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get(':sessionId')
  @ApiOperation({ summary: 'Lấy thông tin sự kiện theo session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin sự kiện lịch',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async getEvent(
    @Param('sessionId') sessionId: string,
  ): Promise<CalendarEvent> {
    const event = await this.calendarService.getEventBySessionId(sessionId);
    if (!event) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return event;
  }

  @Put(':sessionId')
  @ApiOperation({ summary: 'Cập nhật session và đồng bộ lịch' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiBody({
    description: 'Session update payload',
    type: CalendarSessionUpdateDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Session đã được cập nhật và đồng bộ lịch',
    type: CalendarEventResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async updateSessionAndSync(
    @Param('sessionId') sessionId: string,
    @Body() dto: CalendarSessionUpdateDto,
  ): Promise<CalendarEvent> {
    const updates: Partial<{
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      notes: string | null;
      classId: string;
      teacherId: string;
    }> = {};

    if (dto.date) {
      const [year, month, day] = dto.date.split('-').map(Number);
      updates.date = new Date(year, month - 1, day);
    }

    if (dto.startTime) {
      const [hours, minutes, seconds] = dto.startTime.split(':').map(Number);
      updates.startTime = new Date(0, 0, 0, hours, minutes, seconds ?? 0);
    }

    if (dto.endTime) {
      const [hours, minutes, seconds] = dto.endTime.split(':').map(Number);
      updates.endTime = new Date(0, 0, 0, hours, minutes, seconds ?? 0);
    }

    if (dto.notes !== undefined) updates.notes = dto.notes;
    if (dto.classId !== undefined) updates.classId = dto.classId;
    if (dto.teacherId !== undefined) updates.teacherId = dto.teacherId;

    return this.calendarService.updateSessionAndSync(sessionId, updates);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Xóa session và sự kiện lịch Google' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Session đã được xóa' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async deleteSessionAndCalendar(
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean }> {
    await this.calendarService.deleteSessionAndCalendar(sessionId);
    return { success: true };
  }

  @Post(':sessionId/sync')
  @ApiOperation({ summary: 'Đồng bộ thủ công một session lên Google Calendar' })
  @ApiParam({ name: 'sessionId', description: 'Session ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Kết quả đồng bộ',
    type: ResyncResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async syncEvent(
    @Param('sessionId') sessionId: string,
  ): Promise<ResyncResponseDto> {
    return this.calendarService.syncEvent(sessionId);
  }

  @Post('bulk-sync')
  @ApiOperation({ summary: 'Đồng bộ hàng loạt các session lên Google Calendar' })
  @ApiBody({
    description: 'Danh sách session IDs',
    type: BulkSyncDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả đồng bộ hàng loạt',
    type: [ResyncResponseDto],
  })
  async bulkSync(
    @Body() dto: BulkSyncDto,
  ): Promise<ResyncResponseDto[]> {
    return this.calendarService.bulkSync(dto.sessionIds);
  }
}
