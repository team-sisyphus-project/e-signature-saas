-- The product default language is now English. New users start in English;
-- existing users keep whichever locale they already have stored.
ALTER TABLE "users"
ALTER COLUMN "locale" SET DEFAULT 'en';
