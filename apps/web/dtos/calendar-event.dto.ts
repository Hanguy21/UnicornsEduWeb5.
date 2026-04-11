/**
 * Calendar Event DTO
 * Used for admin calendar page to display and filter session-based calendar events
 */

export interface CalendarEvent {
  sessionId: string;
  className: string;
  teacherName: string;
  date: string; // YYYY-MM-DD format
  startTime?: string; // HH:mm:ss format (optional if full day event)
  endTime?: string; // HH:mm:ss format
  meetLink?: string;
  calendarEventId?: string; // Google Calendar event ID if synced
  syncedAt?: string; // ISO datetime when last synced
}

export interface CalendarEventFilters {
  classId?: string;
  teacherId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CalendarSyncPayload {
  sessionId: string;
}

export interface CalendarResyncResponse {
  success: boolean;
  meetLink?: string;
  error?: string;
}
