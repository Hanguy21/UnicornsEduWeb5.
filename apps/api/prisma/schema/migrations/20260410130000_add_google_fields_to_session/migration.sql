-- Add Google Calendar/Meet integration fields to sessions table.

ALTER TABLE "sessions"
ADD COLUMN "google_meet_link" TEXT,
ADD COLUMN "google_calendar_event_id" TEXT,
ADD COLUMN "calendar_synced_at" TIMESTAMPTZ(6),
ADD COLUMN "calendar_sync_error" TEXT;

-- Create index for efficient lookup by Google Calendar event ID.
CREATE INDEX "sessions_googleCalendarEventId_idx" ON "sessions" ("google_calendar_event_id");
