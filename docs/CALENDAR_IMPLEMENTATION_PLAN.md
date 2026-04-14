# Calendar Admin API Implementation Plan

> Archived planning note. The implementation has already happened and the current source of truth is `docs/pages/google-calendar.md`.

## Current state

- Runtime calendar routes now live under `apps/api/src/calendar/`.
- Backend business routes use `/admin/calendar/...` and `/calendar/...`.
- Admin/staff calendar UI uses **schedule-based endpoints** only.
- Session-oriented routes such as `/admin/calendar/events/*` and `/calendar/events/*` are no longer part of the runtime contract.
- Since **2026-04-14**, Google Calendar applies only to recurring entries in `Class.schedule`; create/update/delete `session` does not sync Google Calendar.

## Current route surface

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/calendar/class-schedule` | Expand `Class.schedule` into week occurrences for admin calendar |
| `GET` | `/admin/calendar/classes/:classId/schedule` | Read raw weekly pattern of one class |
| `PUT` | `/admin/calendar/classes/:classId/schedule` | Update weekly pattern and sync recurring Google Calendar events |
| `GET` | `/calendar/classes` | Filter data for class dropdowns |
| `GET` | `/calendar/teachers` | Filter data for teacher dropdowns |
| `GET` | `/calendar/staff/events` | Staff teacher calendar based on schedule occurrences |

## Notes

- `CalendarEventsController` was retired when session-level Google Calendar sync was removed.
- Legacy fields on `sessions` (`google_meet_link`, `google_calendar_event_id`, `calendar_synced_at`, `calendar_sync_error`) remain in the schema for backward compatibility only.
- If you need the up-to-date behavior/spec, read `docs/pages/google-calendar.md` instead of this archived plan.
