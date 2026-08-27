-- Persist each signed-in user's preferred UI color theme. Existing users
-- backfill to `system` (follow the device/OS color scheme) when this migration
-- is applied, so no data migration is needed.
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

ALTER TABLE "users"
ADD COLUMN "theme_preference" "ThemePreference" NOT NULL DEFAULT 'system';
