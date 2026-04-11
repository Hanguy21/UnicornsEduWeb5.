import { Injectable, Logger, OnModuleInit, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { JWT } from 'google-auth-library';
import { calendar_v3, google } from 'googleapis';

import {
  GoogleCalendarEventData,
  CreateCalendarEventResult,
  GoogleCalendarEvent,
  GoogleCalendarConfig,
} from './interfaces/google-calendar.interface';
import { NotFoundException } from '@nestjs/common';
import {
  CalendarEventFilterDto,
  CalendarEventResponseDto,
  ResyncResponseDto,
} from '../dtos/google-calendar.dto';
import { Prisma } from '../../generated/client';
import {
  GoogleCalendarAuthError,
  GoogleCalendarInvalidConfigurationError,
  GoogleCalendarApiError,
  GoogleCalendarEventNotFoundError,
} from './errors/google-calendar.errors';

interface ServiceAccountCredentials {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

type CalendarAuthClient = {
  accessToken: string;
  tokenType: string;
  keys: string[];
};

@Injectable({
  scope: Scope.DEFAULT,
})
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar!: calendar_v3.Calendar;
  private config!: GoogleCalendarConfig;
  private readonly DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
  private readonly GOOGLE_CALENDAR_SCOPE =
    'https://www.googleapis.com/auth/calendar';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.config = this.loadConfig();
  }

  onModuleInit(): void {
    // Initialize calendar if configured, otherwise log warning
    this.initializeCalendar().catch((error) => {
      this.logger.error(
        `Failed to initialize Google Calendar on module init: ${error}`,
      );
    });
  }

  private loadConfig(): GoogleCalendarConfig {
    const serviceAccountKeyBase64 =
      this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY');
    const serviceAccountJsonPath =
      this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_JSON_PATH');
    const calendarId =
      this.configService.get<string>('GOOGLE_CALENDAR_ID');
    const timeZone =
      this.configService.get<string>('GOOGLE_TIME_ZONE') || this.DEFAULT_TIME_ZONE;

    return {
      serviceAccountKeyBase64,
      serviceAccountJsonPath,
      calendarId,
      timeZone,
    };
  }

  private async getServiceAccountCredentials(): Promise<ServiceAccountCredentials | null> {
    const { serviceAccountKeyBase64, serviceAccountJsonPath } = this.config;

    if (serviceAccountKeyBase64) {
      try {
        const json = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
        return JSON.parse(json) as ServiceAccountCredentials;
      } catch (error) {
        this.logger.error(
          `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY base64: ${error}`,
        );
        return null;
      }
    }

    if (serviceAccountJsonPath) {
      try {
        const fs = await import('fs');
        const json = fs.readFileSync(serviceAccountJsonPath, 'utf-8');
        return JSON.parse(json) as ServiceAccountCredentials;
      } catch (error) {
        this.logger.error(
          `Failed to read GOOGLE_SERVICE_ACCOUNT_JSON_PATH: ${error}`,
        );
        return null;
      }
    }

    return null;
  }

  private async initializeCalendar(): Promise<void> {
    if (!this.config.serviceAccountKeyBase64 && !this.config.serviceAccountJsonPath) {
      this.logger.warn(
        'Google Calendar not configured: Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_JSON_PATH',
      );
      return;
    }

    const credentials = await this.getServiceAccountCredentials();
    if (!credentials) {
      throw new GoogleCalendarInvalidConfigurationError(
        'Failed to load service account credentials',
      );
    }

    try {
      const auth = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [this.GOOGLE_CALENDAR_SCOPE],
      });

      const authClient = await auth.authorize() as CalendarAuthClient;

      this.calendar = google.calendar({
        version: 'v3',
        auth: authClient.accessToken,
      }) as calendar_v3.Calendar;

      this.logger.log('Google Calendar client initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to authorize Google Calendar: ${error}`);
      throw new GoogleCalendarAuthError(`Authentication failed: ${error}`);
    }
  }

  private checkCalendarInitialized(): void {
    if (!this.calendar) {
      throw new GoogleCalendarAuthError(
        'Google Calendar client not initialized. Check service account configuration.',
      );
    }
  }

  private buildEventData(
    session: {
      id: string;
      teacherId: string;
      classId: string;
      date: Date;
      startTime?: Date | null;
      endTime?: Date | null;
      notes?: string | null;
      teacher: {
        user?: { email?: string | null } | null;
      } | null;
    },
    teacherEmail: string,
    className: string,
  ): GoogleCalendarEventData {
    const timeZone = this.config.timeZone || this.DEFAULT_TIME_ZONE;

    // Combine date with time
    const sessionDate = new Date(session.date);
    let startDateTime: Date;
    let endDateTime: Date;

    if (session.startTime) {
      startDateTime = new Date(session.startTime);
      startDateTime.setFullYear(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate(),
      );
    } else {
      startDateTime = new Date(sessionDate);
      startDateTime.setHours(14, 0, 0, 0);
    }

    if (session.endTime) {
      endDateTime = new Date(session.endTime);
      endDateTime.setFullYear(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate(),
      );
    } else {
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 2);
    }

    if (endDateTime <= startDateTime) {
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 2);
    }

    const summary = `[Class] ${className} - Session ${session.id.slice(0, 8)}`;
    const description = this.buildEventDescription(session, className);

    return {
      summary,
      description,
      startDateTime,
      endDateTime,
      timeZone,
      attendees: [
        {
          email: teacherEmail,
          role: 'CO_HOST',
        },
      ],
    };
  }

  private buildEventDescription(
    session: {
      id: string;
      notes?: string | null;
      teacher: {
        user?: { email?: string | null } | null;
      } | null;
    },
    className: string,
  ): string {
    const lines = [
      `Class: ${className}`,
      `Session ID: ${session.id}`,
    ];

    if (session.teacher?.user?.email) {
      lines.push(`Teacher Email: ${session.teacher.user.email}`);
    }

    if (session.notes) {
      lines.push(`Notes: ${session.notes}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('This event was created automatically by the UnicornsEdu system.');

    return lines.join('\n');
  }

  async createCalendarEvent(
    sessionId: string,
    teacherEmail: string,
    className: string,
  ): Promise<CreateCalendarEventResult> {
    this.checkCalendarInitialized();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teacher: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const effectiveTeacherEmail =
      teacherEmail || session.teacher.user?.email;
    if (!effectiveTeacherEmail) {
      throw new Error(
        `Teacher email not found for session ${sessionId}. Please provide teacherEmail parameter.`,
      );
    }

    const eventData = this.buildEventData(
      session,
      effectiveTeacherEmail,
      className || session.class.name,
    );

    const requestId = uuidv4();

    try {
      const response = await this.calendar.events.insert({
        calendarId: this.config.calendarId || 'primary',
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTime.toISOString(),
            timeZone: eventData.timeZone,
          },
          end: {
            dateTime: eventData.endDateTime.toISOString(),
            timeZone: eventData.timeZone,
          },
          attendees: eventData.attendees,
          conferenceData: {
            createRequest: {
              requestId,
            },
          },
        },
        conferenceDataVersion: 1,
      });

      const event = response.data as GoogleCalendarEvent;
      const meetLink = event.conferenceData?.entryPoints.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri || '';

      this.logger.log(
        `Created Google Calendar event: ${event.id} for session ${sessionId}`,
      );

      return {
        eventId: event.id,
        meetLink: meetLink,
      };
    } catch (error) {
      this.handleApiError(error, 'Failed to create calendar event');
      throw new GoogleCalendarApiError(
        `Failed to create calendar event for session ${sessionId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async updateCalendarEvent(
    eventId: string,
    sessionId: string,
  ): Promise<CreateCalendarEventResult> {
    this.checkCalendarInitialized();

    const existingEvent = await this.getEvent(eventId);

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        teacher: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
    });

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const teacherEmail = session.teacher.user?.email;
    if (!teacherEmail) {
      throw new Error(`Teacher email not found for session ${sessionId}`);
    }

    const eventData = this.buildEventData(
      session,
      teacherEmail,
      session.class.name,
    );

    try {
      const response = await this.calendar.events.update({
        calendarId: this.config.calendarId || 'primary',
        eventId,
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.startDateTime.toISOString(),
            timeZone: eventData.timeZone,
          },
          end: {
            dateTime: eventData.endDateTime.toISOString(),
            timeZone: eventData.timeZone,
          },
          attendees:
            existingEvent.attendees && existingEvent.attendees.length > 0
              ? existingEvent.attendees
              : eventData.attendees,
        },
        conferenceDataVersion: 1,
      });

      const event = response.data as GoogleCalendarEvent;
      const meetLink = event.conferenceData?.entryPoints.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri || '';

      this.logger.log(
        `Updated Google Calendar event: ${eventId} for session ${sessionId}`,
      );

      return {
        eventId: event.id,
        meetLink: meetLink,
      };
    } catch (error) {
      this.handleApiError(error, 'Failed to update calendar event');
      throw new GoogleCalendarApiError(
        `Failed to update calendar event ${eventId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async resyncSessionCalendar(sessionId: string): Promise<void> {
    if (!this.config.serviceAccountKeyBase64 && !this.config.serviceAccountJsonPath) {
      return;
    }

    this.checkCalendarInitialized();

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { googleCalendarEventId: true },
    });

    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    try {
      if (session.googleCalendarEventId) {
        const result = await this.updateCalendarEvent(
          session.googleCalendarEventId,
          sessionId,
        );
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            googleMeetLink: result.meetLink || null,
            calendarSyncedAt: new Date(),
            calendarSyncError: null,
          },
        });
        return;
      }

      const result = await this.createCalendarEvent(sessionId, '', '');
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          googleCalendarEventId: result.eventId,
          googleMeetLink: result.meetLink || null,
          calendarSyncedAt: new Date(),
          calendarSyncError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.session
        .update({
          where: { id: sessionId },
          data: { calendarSyncError: message },
        })
        .catch(() => undefined);
      throw err;
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<void> {
    this.checkCalendarInitialized();

    try {
      await this.calendar.events.delete({
        calendarId: this.config.calendarId || 'primary',
        eventId,
      });

      this.logger.log(`Deleted Google Calendar event: ${eventId}`);
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message?.includes('not found')
      ) {
        this.logger.warn(`Event ${eventId} not found during delete, treating as success`);
        return;
      }

      this.handleApiError(error, 'Failed to delete calendar event');
      throw new GoogleCalendarApiError(
        `Failed to delete calendar event ${eventId}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }

  async getEvent(eventId: string): Promise<GoogleCalendarEvent> {
    this.checkCalendarInitialized();

    try {
      const response = await this.calendar.events.get({
        calendarId: this.config.calendarId || 'primary',
        eventId,
      });

      return response.data as GoogleCalendarEvent;
    } catch (error) {
      this.handleApiError(error, 'Failed to get calendar event');
      throw new GoogleCalendarEventNotFoundError(eventId);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.checkCalendarInitialized();

      const response = await this.calendar.calendarList.list({
        maxResults: 1,
      });

      this.logger.log(
        `Google Calendar connection test successful. Found ${response.data.items?.length || 0} calendars`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Google Calendar connection test failed: ${error}`);
      return false;
    }
  }

  private handleApiError(error: unknown, context: string): void {
    const err = error as Error & { errors?: unknown[]; code?: string };

    this.logger.error(`${context}:`, {
      message: err.message,
      code: err.code,
      errors: err.errors,
    });

    if (err.message?.includes('invalid_grant') || err.message?.includes('401')) {
      throw new GoogleCalendarAuthError(`Authentication error: ${err.message}`);
    }
  }

  async createOrUpdateClassScheduleRecurringEvent(params: {
    classId: string;
    className: string;
    entryId?: string;
    calendarEventId?: string;
    teacherEmails: string[];
    dayOfWeek: number;
    from: string;
    end: string;
  }): Promise<{ eventId: string; meetLink?: string }> {
    this.checkCalendarInitialized();

    const {
      classId,
      className,
      entryId,
      calendarEventId,
      teacherEmails,
      dayOfWeek,
      from,
      end,
    } = params;

    const dayMap: Record<number, string> = {
      0: 'SU',
      1: 'MO',
      2: 'TU',
      3: 'WE',
      4: 'TH',
      5: 'FR',
      6: 'SA',
    };
    const byday = dayMap[dayOfWeek];
    if (!byday) {
      throw new Error(`Invalid dayOfWeek: ${dayOfWeek}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    const firstOccurrence = new Date(today);
    firstOccurrence.setDate(today.getDate() + diff);

    const parseTime = (timeStr: string) => {
      const parts = timeStr.split(':').map(Number);
      const hours = parts[0] ?? 0;
      const minutes = parts[1] ?? 0;
      const seconds = parts[2] ?? 0;
      return { hours, minutes, seconds };
    };

    const { hours: startHours, minutes: startMinutes, seconds: startSeconds } = parseTime(from);
    const { hours: endHours, minutes: endMinutes, seconds: endSeconds } = parseTime(end);

    const startDateTime = new Date(firstOccurrence);
    startDateTime.setHours(startHours, startMinutes, startSeconds, 0);

    const endDateTime = new Date(firstOccurrence);
    endDateTime.setHours(endHours, endMinutes, endSeconds, 0);

    if (endDateTime <= startDateTime) {
      throw new Error(
        `Invalid time range for class ${classId}: ${from} - ${end}`,
      );
    }

    const normalizedTeacherEmails = Array.from(
      new Set(
        teacherEmails
          .map((email) => email.trim())
          .filter((email) => email.length > 0),
      ),
    );
    const summary = `[Class] ${className} - Weekly`;
    const descriptionLines = [
      `Class: ${className}`,
      `Class ID: ${classId}`,
      entryId ? `Schedule Entry ID: ${entryId}` : null,
      `Schedule: Weekly on ${byday}`,
      `Time: ${from} - ${end}`,
      normalizedTeacherEmails.length > 0
        ? `Teachers: ${normalizedTeacherEmails.join(', ')}`
        : null,
      '',
      'This event was created automatically by the UnicornsEdu system.',
    ].filter((line): line is string => Boolean(line));
    const description = descriptionLines.join('\n');
    const existingEventId = calendarEventId;

    const eventBody: calendar_v3.Schema$Event = {
      summary,
      description,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: this.config.timeZone || this.DEFAULT_TIME_ZONE,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: this.config.timeZone || this.DEFAULT_TIME_ZONE,
      },
      recurrence: [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`],
      attendees: normalizedTeacherEmails.map((email) => ({
        email,
        role: 'CO_HOST' as const,
      })),
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
        },
      },
    };

    try {
      let response;
      if (existingEventId) {
        response = await this.calendar.events.update({
          calendarId: this.config.calendarId || 'primary',
          eventId: existingEventId,
          requestBody: eventBody,
          conferenceDataVersion: 1,
        });
      } else {
        response = await this.calendar.events.insert({
          calendarId: this.config.calendarId || 'primary',
          requestBody: eventBody,
          conferenceDataVersion: 1,
        });
      }

      const event = response.data as GoogleCalendarEvent;
      if (!event.id) {
        throw new GoogleCalendarApiError(
          `Google Calendar did not return an event id for class ${className}`,
        );
      }
      const meetLink =
        event.conferenceData?.entryPoints.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri || '';

      this.logger.log(
        `Created/updated Google Calendar event: ${event.id} for class ${className}`,
      );

      return { eventId: event.id, meetLink: meetLink || undefined };
    } catch (error) {
      this.handleApiError(
        error,
        'Failed to create/update class schedule recurring event',
      );
      throw new GoogleCalendarApiError(
        `Failed to create/update class schedule recurring event for class ${className}`,
        error as Error & { errors?: unknown[] },
      );
    }
  }
}
