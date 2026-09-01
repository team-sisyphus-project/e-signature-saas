-- Keep new users aligned with the application locale fallback.
ALTER TABLE "User" ALTER COLUMN "locale" SET DEFAULT 'ko';
