DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'person_profile_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'person_profiles'
  ) THEN
    EXECUTE $sql$
      WITH normalized_person_profiles AS (
        SELECT
          id,
          NULLIF(TRIM(first_name), '') AS normalized_first_name,
          NULLIF(TRIM(last_name), '') AS normalized_last_name,
          COALESCE(
            NULLIF(regexp_replace(TRIM(full_name), '\s+', ' ', 'g'), ''),
            NULLIF(
              regexp_replace(
                TRIM(
                  CONCAT_WS(
                    ' ',
                    NULLIF(TRIM(first_name), ''),
                    NULLIF(TRIM(last_name), '')
                  )
                ),
                '\s+',
                ' ',
                'g'
              ),
              ''
            )
          ) AS normalized_full_name
        FROM person_profiles
      )
      UPDATE users AS u
      SET
        first_name = COALESCE(
          NULLIF(TRIM(u.first_name), ''),
          normalized_person_profiles.normalized_first_name,
          split_part(normalized_person_profiles.normalized_full_name, ' ', 1)
        ),
        last_name = COALESCE(
          NULLIF(TRIM(u.last_name), ''),
          normalized_person_profiles.normalized_last_name,
          NULLIF(
            TRIM(
              regexp_replace(
                normalized_person_profiles.normalized_full_name,
                '^\S+\s*',
                ''
              )
            ),
            ''
          )
        )
      FROM normalized_person_profiles
      WHERE u.person_profile_id = normalized_person_profiles.id
        AND normalized_person_profiles.normalized_full_name IS NOT NULL
        AND (
          NULLIF(TRIM(u.first_name), '') IS NULL
          OR NULLIF(TRIM(u.last_name), '') IS NULL
        )
    $sql$;
  END IF;
END $$;

ALTER TABLE "users"
DROP COLUMN IF EXISTS "person_profile_id" CASCADE;

DROP TABLE IF EXISTS "person_profiles" CASCADE;
