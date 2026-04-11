import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/client';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import {
  CalendarEventFilterDto,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import {
  ClassScheduleEntryDto,
  ClassScheduleEventDto,
  ClassScheduleFilterDto,
  ClassSyncResponseDto,
} from '../dtos/class-schedule.dto';

export interface CalendarEvent {
  sessionId: string;
  className: string;
  teacherName: string;
  date: string;
  startTime?: string;
  endTime?: string;
  meetLink?: string;
  calendarEventId?: string;
  syncedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SyncResult {
  sessionId: string;
  success: boolean;
  meetLink?: string;
  error?: string;
}

interface StoredClassScheduleEntry {
  id?: string;
  dayOfWeek?: number;
  from?: string;
  to?: string;
  end?: string;
  calendarEventId?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  private getStoredClassScheduleEntries(
    schedule: Prisma.JsonValue | null | undefined,
  ): StoredClassScheduleEntry[] {
    if (!Array.isArray(schedule)) {
      return [];
    }

    return schedule
      .filter(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          !Array.isArray(entry),
      )
      .map((rawEntry) => {
        const entry = rawEntry as Prisma.JsonObject;

        return {
        id: typeof entry.id === 'string' ? entry.id : undefined,
        dayOfWeek:
          typeof entry.dayOfWeek === 'number' ? entry.dayOfWeek : undefined,
        from: typeof entry.from === 'string' ? entry.from : undefined,
        to: typeof entry.to === 'string' ? entry.to : undefined,
        end: typeof entry.end === 'string' ? entry.end : undefined,
        calendarEventId:
          typeof entry.calendarEventId === 'string'
            ? entry.calendarEventId
            : undefined,
        };
      });
  }

  private serializeStoredClassScheduleEntries(
    entries: Array<{
      id?: string;
      dayOfWeek?: number;
      from?: string;
      to?: string;
      calendarEventId?: string;
    }>,
  ): Prisma.InputJsonValue {
    return entries.map((entry) => ({
      ...(entry.id ? { id: entry.id } : {}),
      ...(typeof entry.dayOfWeek === 'number'
        ? { dayOfWeek: entry.dayOfWeek }
        : {}),
      ...(entry.from ? { from: entry.from } : {}),
      ...(entry.to ? { to: entry.to } : {}),
      ...(entry.calendarEventId
        ? { calendarEventId: entry.calendarEventId }
        : {}),
    })) as Prisma.InputJsonValue;
  }

  private formatTime(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return date.toTimeString().slice(0, 8);
  }

  private parseDateOnly(dateValue: string): Date {
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private formatDate(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async mapSessionToCalendarEvent(
    session: {
      id: string;
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      googleMeetLink: string | null;
      googleCalendarEventId: string | null;
      calendarSyncedAt: Date | null;
      class: { name: string };
      teacher: {
        id: string;
        user?: { first_name: string | null; last_name: string | null } | null;
      } | null;
    },
  ): Promise<CalendarEvent> {
    const teacherName = session.teacher?.user
      ? `${session.teacher.user.last_name || ''} ${session.teacher.user.first_name || ''}`.trim() || 'N/A'
      : 'N/A';

    return {
      sessionId: session.id,
      className: session.class.name,
      teacherName,
      date: this.formatDate(session.date) || '',
      startTime: this.formatTime(session.startTime),
      endTime: this.formatTime(session.endTime),
      meetLink: session.googleMeetLink || undefined,
      calendarEventId: session.googleCalendarEventId || undefined,
      syncedAt: session.calendarSyncedAt?.toISOString() || undefined,
    };
  }

  async getAdminEvents(
    filters: CalendarEventFilterDto,
  ): Promise<PaginatedResponse<CalendarEvent>> {
    const { startDate, endDate, classId, teacherId } = filters;

    const startDt = this.parseDateOnly(startDate);
    startDt.setHours(0, 0, 0, 0);
    const endDt = this.parseDateOnly(endDate);
    endDt.setHours(23, 59, 59, 999);

    const where: Prisma.SessionWhereInput = {
      date: {
        gte: startDt,
        lte: endDt,
      },
      ...(classId && { classId }),
      ...(teacherId && { teacherId }),
    };

    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const events = await Promise.all(
      sessions.map((session) => this.mapSessionToCalendarEvent(session)),
    );

    return {
      data: events,
      total: events.length,
      page: 1,
      limit: events.length,
    };
  }

  async getEventBySessionId(
    sessionId: string,
  ): Promise<CalendarEvent | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return this.mapSessionToCalendarEvent(session);
  }

  async updateSessionAndSync(
    sessionId: string,
    updates: Partial<{
      date: Date;
      startTime: Date | null;
      endTime: Date | null;
      notes: string | null;
      classId: string;
      teacherId: string;
    }>,
  ): Promise<CalendarEvent> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    const updateData: Record<string, unknown> = {};
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.classId !== undefined) updateData.classId = updates.classId;
    if (updates.teacherId !== undefined) updateData.teacherId = updates.teacherId;

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        class: {
          select: { name: true },
        },
        teacher: {
          include: {
            user: {
              select: { first_name: true, last_name: true },
            },
          },
        },
      },
    });

    if (session.googleCalendarEventId) {
      try {
        await this.googleCalendarService.resyncSessionCalendar(sessionId);
      } catch (error) {
        this.logger.error(`Failed to resync calendar event for session ${sessionId}:`, error);
      }
    }

    return this.mapSessionToCalendarEvent(updatedSession);
  }

  async deleteSessionAndCalendar(sessionId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { googleCalendarEventId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    if (session.googleCalendarEventId) {
      try {
        await this.googleCalendarService.deleteCalendarEvent(
          session.googleCalendarEventId,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to delete Google Calendar event ${session.googleCalendarEventId} for session ${sessionId}:`,
          error,
        );
      }
    }

    await this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async syncEvent(sessionId: string): Promise<ResyncResponseDto> {
    try {
      await this.googleCalendarService.resyncSessionCalendar(sessionId);

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        select: { googleMeetLink: true },
      });

      return {
        success: true,
        meetLink: session?.googleMeetLink || undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
      };
    }
  }

  async bulkSync(
    sessionIds: string[],
  ): Promise<ResyncResponseDto[]> {
    if (sessionIds.length === 0) {
      return [];
    }

    const sessions = await this.prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true },
    });

    const foundIds = new Set(sessions.map((s) => s.id));
    const missingIds = sessionIds.filter((id) => !foundIds.has(id));

    const results: ResyncResponseDto[] = missingIds.map((id) => ({
      success: false,
      error: 'Session not found',
    }));

    const validSessionIds = sessions.map((s) => s.id);

    await Promise.allSettled(
      validSessionIds.map(async (sessionId) => {
        try {
          await this.googleCalendarService.resyncSessionCalendar(sessionId);

          const session = await this.prisma.session.findUnique({
            where: { id: sessionId },
            select: { googleMeetLink: true },
          });

          results.push({
            success: true,
            meetLink: session?.googleMeetLink || undefined,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.push({
            success: false,
            error: message,
          });
        }
      }),
    );

    return results;
  }

  async getClasses(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponse<{ id: string; name: string }>> {
    const skip = (page - 1) * limit;

    const [classes, total] = await Promise.all([
      this.prisma.class.findMany({
        where: { status: 'running' },
        select: { id: true, name: true },
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.class.count({ where: { status: 'running' } }),
    ]);

    return {
      data: classes,
      total,
      page,
      limit,
    };
  }

  async getTeachers(
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponse<{ id: string; name: string }>> {
    const skip = (page - 1) * limit;

    const [staffInfos, total] = await Promise.all([
      this.prisma.staffInfo.findMany({
        where: { status: 'active' },
        include: {
          user: {
            select: { first_name: true, last_name: true },
          },
        },
        skip,
        take: limit,
        orderBy: {
          user: {
            last_name: 'asc',
          },
        },
      }),
      this.prisma.staffInfo.count({ where: { status: 'active' } }),
    ]);

    const teachers = staffInfos.map((staff) => {
      const fullName = staff.user
        ? `${staff.user.last_name || ''} ${staff.user.first_name || ''}`.trim()
        : 'N/A';
      return {
        id: staff.id,
        name: fullName,
      };
    });

    return {
      data: teachers,
      total,
      page,
      limit,
    };
  }

  async getGoogleCalendarStatus():
    Promise<{
      googleCalendarConfigured: boolean;
      connectionStatus: 'connected' | 'disconnected' | 'error';
      lastCheck: string;
    }> {
    try {
      const connected = await this.googleCalendarService.testConnection();
      return {
        googleCalendarConfigured: true,
        connectionStatus: connected ? 'connected' : 'disconnected',
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return {
        googleCalendarConfigured: false,
        connectionStatus: 'error',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private getNextDateForDay(date: Date, dayOfWeek: number): Date {
    const result = new Date(date);
    const currentDay = result.getDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private getOccurrencesInRange(start: Date, end: Date, dayOfWeek: number): Date[] {
    const first = this.getNextDateForDay(start, dayOfWeek);
    if (first > end) {
      return [];
    }
    const occurrences: Date[] = [];
    let current = new Date(first);
    while (current <= end) {
      occurrences.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return occurrences;
  }

  async getClassScheduleEvents(
    filters: ClassScheduleFilterDto,
  ): Promise<{ success: boolean; data: ClassScheduleEventDto[]; total: number }> {
    const { startDate, endDate, classId, teacherId } = filters;

    const startDt = this.parseDateOnly(startDate);
    startDt.setHours(0, 0, 0, 0);
    const endDt = this.parseDateOnly(endDate);
    endDt.setHours(23, 59, 59, 999);

    const where: Prisma.ClassWhereInput = {};
    if (classId) {
      where.id = classId;
    }
    if (teacherId) {
      where.teachers = {
        some: {
          teacherId,
        },
      };
    }

    const classes = await this.prisma.class.findMany({
      where,
      include: {
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
                  select: { first_name: true, last_name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    const events: ClassScheduleEventDto[] = [];

    for (const cls of classes) {
      const targetTeachers = teacherId
        ? cls.teachers.filter(
            (teacherRecord) => teacherRecord.teacherId === teacherId,
          )
        : cls.teachers;
      if (teacherId && targetTeachers.length === 0) continue;

      const teacherNames = Array.from(
        new Set(
          targetTeachers.map((teacherRecord) => {
            const user = teacherRecord.teacher.user;
            return user
              ? `${user.last_name || ''} ${user.first_name || ''}`.trim() || 'N/A'
              : 'N/A';
          }),
        ),
      );
      const teacherIds = Array.from(
        new Set(targetTeachers.map((teacherRecord) => teacherRecord.teacherId)),
      );

      const rawSchedule = this.getStoredClassScheduleEntries(cls.schedule);
      for (const entry of rawSchedule) {
        const dayOfWeek = entry.dayOfWeek;
        if (dayOfWeek === undefined) continue;
        const from = entry.from;
        const end = entry.to || entry.end;
        if (!from || !end) continue;

        const occurrenceDates = this.getOccurrencesInRange(startDt, endDt, dayOfWeek);
        if (occurrenceDates.length === 0) continue;

        for (const occDate of occurrenceDates) {
          const dateStr = this.formatDate(occDate) || '';
          const entryId = entry.id || `${cls.id}-${dayOfWeek}-${from}-${dateStr}`;
          const occurrenceId = `${cls.id}-${entryId}-${dateStr}`;
          events.push({
            occurrenceId,
            classId: cls.id,
            className: cls.name,
            teacherIds,
            teacherNames,
            date: dateStr,
            startTime: from,
            endTime: end,
            meetLink: undefined,
            calendarEventId: entry.calendarEventId,
            patternEntryId: entry.id,
          });
        }
      }
    }

    events.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return { success: true, data: events, total: events.length };
  }

  async getClassSchedulePattern(
    classId: string,
  ): Promise<{ success: boolean; data: ClassScheduleEntryDto[] }> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { schedule: true },
    });
    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }
    const entries: ClassScheduleEntryDto[] = this.getStoredClassScheduleEntries(
      cls.schedule,
    ).map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek ?? 0,
      from: entry.from ?? '',
      end: entry.to || entry.end || '',
      calendarEventId: entry.calendarEventId,
    }));
    return { success: true, data: entries };
  }

  async updateClassSchedulePattern(
    classId: string,
    entries: ClassScheduleEntryDto[],
  ): Promise<{ success: boolean; data: ClassScheduleEntryDto[] }> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }

    const storageEntries = this.serializeStoredClassScheduleEntries(
      entries.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        to: entry.end,
        calendarEventId: entry.calendarEventId,
      })),
    );

    await this.prisma.class.update({
      where: { id: classId },
      data: { schedule: storageEntries },
    });

    return { success: true, data: entries };
  }

  async syncClassScheduleToGoogle(
    classId: string,
  ): Promise<ClassSyncResponseDto> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        schedule: true,
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
                  select: { email: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException(`Class not found: ${classId}`);
    }

    const teacherEmails = Array.from(
      new Set(
        cls.teachers
          .map((teacherRecord) => teacherRecord.teacher.user?.email?.trim())
          .filter(
            (email): email is string =>
              typeof email === 'string' && email.length > 0,
          ),
      ),
    );
    const scheduleEntries = this.getStoredClassScheduleEntries(cls.schedule).map(
      (entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        to: entry.to || entry.end,
        calendarEventId: entry.calendarEventId,
      }),
    );

    if (scheduleEntries.length === 0) {
      return { success: true, entriesSynced: 0 };
    }

    if (teacherEmails.length === 0) {
      return {
        success: false,
        entriesSynced: 0,
        errors: [`Class ${classId} has no teacher emails to invite.`],
      };
    }

    const errors: string[] = [];
    let entriesSynced = 0;

    for (const entry of scheduleEntries) {
      const entryLabel =
        entry.id ||
        `${entry.dayOfWeek ?? 'unknown'}-${entry.from ?? 'unknown'}-${entry.to ?? 'unknown'}`;

      if (
        entry.dayOfWeek === undefined ||
        !entry.from ||
        !entry.to
      ) {
        errors.push(`Entry ${entryLabel}: missing dayOfWeek/from/to.`);
        continue;
      }

      try {
        const result =
          await this.googleCalendarService.createOrUpdateClassScheduleRecurringEvent(
            {
              classId: cls.id,
              className: cls.name,
              entryId: entry.id,
              calendarEventId: entry.calendarEventId,
              dayOfWeek: entry.dayOfWeek,
              from: entry.from,
              end: entry.to,
              teacherEmails,
            },
          );

        entry.calendarEventId = result.eventId;
        entriesSynced += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        errors.push(`Entry ${entryLabel}: ${message}`);
      }
    }

    await this.prisma.class.update({
      where: { id: classId },
      data: {
        schedule: this.serializeStoredClassScheduleEntries(scheduleEntries),
      },
    });

    return {
      success: errors.length === 0,
      entriesSynced,
      ...(errors.length > 0 ? { errors } : {}),
    };
  }
}
