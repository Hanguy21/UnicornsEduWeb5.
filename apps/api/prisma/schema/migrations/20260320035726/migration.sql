-- AlterEnum
BEGIN;
UPDATE "public"."staff_info"
SET "roles" = COALESCE(
  ARRAY(
    SELECT dedup.mapped_role
    FROM (
      SELECT MIN(mapped_roles.ordinality) AS first_ordinality, mapped_roles.mapped_role
      FROM (
        SELECT
          ordinality,
          CASE
            WHEN role::text = 'communication_head' THEN 'communication'
            WHEN role::text = 'customer_care_head' THEN 'customer_care'
            ELSE role::text
          END::"StaffRole" AS mapped_role
        FROM unnest("roles") WITH ORDINALITY AS expanded_roles(role, ordinality)
      ) AS mapped_roles
      GROUP BY mapped_roles.mapped_role
    ) AS dedup
    ORDER BY dedup.first_ordinality
  ),
  ARRAY[]::"StaffRole"[]
)
WHERE "roles" && ARRAY['communication_head'::"StaffRole", 'customer_care_head'::"StaffRole"];

CREATE TYPE "StaffRole_new" AS ENUM ('admin', 'teacher', 'lesson_plan', 'lesson_plan_head', 'accountant', 'communication', 'customer_care', 'assistant');
ALTER TABLE "public"."staff_info" ALTER COLUMN "roles" DROP DEFAULT;
ALTER TABLE "staff_info" ALTER COLUMN "roles" TYPE "StaffRole_new"[] USING ("roles"::text::"StaffRole_new"[]);
ALTER TYPE "StaffRole" RENAME TO "StaffRole_old";
ALTER TYPE "StaffRole_new" RENAME TO "StaffRole";
DROP TYPE "public"."StaffRole_old";
ALTER TABLE "staff_info" ALTER COLUMN "roles" SET DEFAULT ARRAY[]::"StaffRole"[];
COMMIT;
