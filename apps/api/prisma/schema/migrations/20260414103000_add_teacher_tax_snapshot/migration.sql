ALTER TABLE "class_teachers"
ADD COLUMN IF NOT EXISTS "tax_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "teacher_tax_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "teacher_tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "attendance"
ADD COLUMN IF NOT EXISTS "customer_care_tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "assistant_tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "extra_allowances"
ADD COLUMN IF NOT EXISTS "tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "lesson_outputs"
ADD COLUMN IF NOT EXISTS "role_type" "StaffRole",
ADD COLUMN IF NOT EXISTS "tax_deduction_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "role_tax_deduction_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "role_type" "StaffRole" NOT NULL,
  "rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "effective_from" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "role_tax_deduction_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "role_tax_deduction_rates_role_type_effective_from_key"
ON "role_tax_deduction_rates"("role_type", "effective_from");

CREATE INDEX IF NOT EXISTS "role_tax_deduction_rates_role_type_effective_from_idx"
ON "role_tax_deduction_rates"("role_type", "effective_from");

CREATE TABLE IF NOT EXISTS "staff_tax_deduction_overrides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "staff_id" TEXT NOT NULL,
  "role_type" "StaffRole" NOT NULL,
  "rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "effective_from" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "staff_tax_deduction_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "staff_tax_deduction_overrides_staff_id_fkey"
    FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_tax_deduction_overrides_staff_id_role_type_effective_from_key"
ON "staff_tax_deduction_overrides"("staff_id", "role_type", "effective_from");

CREATE INDEX IF NOT EXISTS "staff_tax_deduction_overrides_staff_id_role_type_effective_from_idx"
ON "staff_tax_deduction_overrides"("staff_id", "role_type", "effective_from");

CREATE INDEX IF NOT EXISTS "staff_tax_deduction_overrides_role_type_effective_from_idx"
ON "staff_tax_deduction_overrides"("role_type", "effective_from");

CREATE TABLE IF NOT EXISTS "class_teacher_operating_deduction_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "class_id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "effective_from" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "class_teacher_operating_deduction_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "class_teacher_operating_deduction_rates_class_id_fkey"
    FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "class_teacher_operating_deduction_rates_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "class_teacher_operating_deduction_rates_class_id_teacher_id_effective_from_key"
ON "class_teacher_operating_deduction_rates"("class_id", "teacher_id", "effective_from");

CREATE INDEX IF NOT EXISTS "class_teacher_operating_deduction_rates_class_id_teacher_id_effective_from_idx"
ON "class_teacher_operating_deduction_rates"("class_id", "teacher_id", "effective_from");

CREATE INDEX IF NOT EXISTS "class_teacher_operating_deduction_rates_teacher_id_effective_from_idx"
ON "class_teacher_operating_deduction_rates"("teacher_id", "effective_from");

INSERT INTO "class_teacher_operating_deduction_rates" (
  "class_id",
  "teacher_id",
  "rate_percent",
  "effective_from"
)
SELECT
  "class_id",
  "teacher_id",
  "tax_rate_percent",
  ("created_at" AT TIME ZONE 'UTC')::date
FROM "class_teachers"
ON CONFLICT ("class_id", "teacher_id", "effective_from") DO NOTHING;

UPDATE "lesson_outputs" AS "lesson_outputs"
SET "role_type" = CASE
  WHEN "staff_info"."roles" @> ARRAY['lesson_plan_head']::"StaffRole"[] THEN 'lesson_plan_head'::"StaffRole"
  WHEN "staff_info"."roles" @> ARRAY['lesson_plan']::"StaffRole"[] THEN 'lesson_plan'::"StaffRole"
  ELSE NULL
END
FROM "staff_info"
WHERE "lesson_outputs"."staff_id" = "staff_info"."id";
