import { api } from "../client";
import {
  ClassScheduleEntry,
  ClassScheduleEvent,
  ClassScheduleFilter,
  ClassSyncResponse,
} from "@/dtos/class-schedule.dto";

/**
 * Class Schedule API
 * Endpoints for managing class-based calendar scheduling
 */

/**
 * Fetch class schedule events within a date range with optional filters
 */
export async function getClassScheduleEvents(
  params: ClassScheduleFilter
): Promise<{ data: ClassScheduleEvent[]; total: number }> {
  const response = await api.get<{
    data: ClassScheduleEvent[];
    total?: number;
    meta?: { total: number };
  }>(
    "/admin/calendar/class-schedule",
    { params }
  );
  return {
    data: response.data.data,
    total: response.data.meta?.total ?? response.data.total ?? response.data.data.length,
  };
}

/**
 * Fetch the weekly schedule pattern for a specific class
 */
export async function getClassSchedulePattern(
  classId: string
): Promise<{ data: ClassScheduleEntry[] }> {
  const response = await api.get<{
    data: Array<{
      id?: string;
      dayOfWeek: number;
      from: string;
      end: string;
      calendarEventId?: string;
    }>;
  }>(
    `/admin/calendar/classes/${encodeURIComponent(classId)}/schedule`
  );
  return {
    data: response.data.data.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      from: entry.from,
      to: entry.end,
      calendarEventId: entry.calendarEventId,
    })),
  };
}

/**
 * Update the weekly schedule pattern for a specific class
 */
export async function updateClassSchedulePattern(
  classId: string,
  entries: ClassScheduleEntry[]
): Promise<{ data: ClassScheduleEntry[] }> {
  const response = await api.put<{
    data: Array<{
      id?: string;
      dayOfWeek: number;
      from: string;
      end: string;
      calendarEventId?: string;
    }>;
  }>(
    `/admin/calendar/classes/${encodeURIComponent(classId)}/schedule`,
    {
      schedule: entries.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        from: entry.from,
        end: entry.to,
        calendarEventId: entry.calendarEventId,
      })),
    }
  );
  return {
    data: response.data.data.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      from: entry.from,
      to: entry.end,
      calendarEventId: entry.calendarEventId,
    })),
  };
}

/**
 * Sync a class's schedule to Google Calendar (generates events for all occurrences in date range)
 */
export async function syncClassSchedule(
  classId: string
): Promise<ClassSyncResponse> {
  const response = await api.post<{ data: ClassSyncResponse }>(
    `/admin/calendar/classes/${encodeURIComponent(classId)}/schedule/sync`
  );
  return response.data.data;
}

/**
 * Fetch all running classes for filter dropdown
 * Reuses existing class API endpoint
 */
export async function getClassesForFilter(limit: number = 100): Promise<{ data: Array<{ id: string; name: string }> }> {
  const response = await api.get<{ data: Array<{ id: string; name: string }> }>("/calendar/classes", {
    params: { status: "running", limit },
  });
  return response.data;
}

/**
 * Fetch all teachers (staff with teaching role) for filter dropdown
 * Reuses existing staff API endpoint
 */
export async function getTeachersForFilter(limit: number = 100): Promise<{ data: Array<{ id: string; fullName: string }> }> {
  const response = await api.get<{
    data: Array<{ id: string; name: string }>;
  }>("/calendar/teachers", {
    params: { limit },
  });
  return {
    data: response.data.data.map((teacher) => ({
      id: teacher.id,
      fullName: teacher.name,
    })),
  };
}
