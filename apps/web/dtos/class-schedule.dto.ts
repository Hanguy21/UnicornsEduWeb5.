/**
 * Class Schedule DTOs
 * Used for class-based calendar view and management
 */

/**
 * Represents a weekly schedule pattern entry for a class
 */
export interface ClassScheduleEntry {
  id?: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  from: string; // HH:mm:ss format
  to: string; // HH:mm:ss format
  calendarEventId?: string; // Google Calendar event ID if synced
}

/**
 * Represents a specific class session occurrence in the calendar
 */
export interface ClassScheduleEvent {
  occurrenceId: string; // Unique ID for this occurrence
  classId: string;
  className: string;
  teacherIds: string[];
  teacherNames: string[];
  date: string; // YYYY-MM-DD format
  startTime?: string; // HH:mm:ss format (optional if full day)
  endTime?: string; // HH:mm:ss format
  meetLink?: string;
  calendarEventId?: string; // Google Calendar event ID if synced
  calendarEventUrl?: string; // Google Calendar event URL
  patternEntryId?: string; // Reference to the ClassScheduleEntry that generated this
}

/**
 * Filters for class schedule view
 */
export interface ClassScheduleFilter {
  classId?: string;
  teacherId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Response from syncing class schedule to Google Calendar
 */
export interface ClassSyncResponse {
  success: boolean;
  entriesSynced?: number;
  error?: string;
}
