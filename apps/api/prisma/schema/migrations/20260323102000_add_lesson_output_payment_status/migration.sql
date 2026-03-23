ALTER TABLE "lesson_outputs"
ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending';

UPDATE "lesson_outputs"
SET "payment_status" = CASE
  WHEN COALESCE("cost", 0) > 0 THEN 'pending'::"PaymentStatus"
  ELSE 'paid'::"PaymentStatus"
END;

CREATE INDEX "lesson_outputs_staff_id_payment_status_date_idx"
ON "lesson_outputs"("staff_id", "payment_status", "date");
