import { api } from "../client";
import {
  CalendarEvent,
  CalendarEventFilters,
  CalendarSyncPayload,
  CalendarResyncResponse,
} from "@/dtos/calendar-event.dto";

/**
 * Admin Calendar API
 * Endpoints for managing and viewing calendar events (sessions synced to Google Calendar)
 */

export async function getAdminCalendarEvents(
  params: CalendarEventFilters
): Promise<{ data: CalendarEvent[]; total: number }> {
  const response = await api.get<{ data: CalendarEvent[]; meta: { total: number } }>("/admin/calendar/events", {
    params,
  });
  return {
    data: response.data.data,
    total: response.data.meta.total,
  };
}

export async function resyncSessionCalendar(
  sessionId: string
): Promise<CalendarResyncResponse> {
  const response = await api.post<{ data: CalendarResyncResponse }>(
    `/admin/calendar/events/${encodeURIComponent(sessionId)}/resync`
  );
  return response.data.data;
}

export async function createCalendarEvent(
  payload: CalendarSyncPayload
): Promise<CalendarResyncResponse> {
  const response = await api.post<{ data: CalendarResyncResponse }>(
    "/admin/calendar/events",
    payload
  );
  return response.data.data;
}

export async function deleteCalendarEvent(
  sessionId: string
): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete<{ data: { success: boolean; message?: string } }>(
    `/admin/calendar/events/${encodeURIComponent(sessionId)}`
  );
  return response.data.data;
}
