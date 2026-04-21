DROP INDEX IF EXISTS "staff_info_person_profile_id_key";
DROP INDEX IF EXISTS "staff_info_person_profile_id_idx";
DROP INDEX IF EXISTS "student_info_person_profile_id_key";
DROP INDEX IF EXISTS "student_info_person_profile_id_idx";

ALTER TABLE "staff_info"
DROP COLUMN IF EXISTS "person_profile_id" CASCADE;

ALTER TABLE "student_info"
DROP COLUMN IF EXISTS "person_profile_id" CASCADE;
