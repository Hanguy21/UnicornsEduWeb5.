-- Per-user read state for published notifications (staff/student feed).

CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_reads_user_id_notification_id_key" ON "notification_reads"("user_id", "notification_id");

CREATE INDEX "notification_reads_user_id_idx" ON "notification_reads"("user_id");

CREATE INDEX "notification_reads_notification_id_idx" ON "notification_reads"("notification_id");

ALTER TABLE "notification_reads"
ADD CONSTRAINT "notification_reads_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reads"
ADD CONSTRAINT "notification_reads_notification_id_fkey"
FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
