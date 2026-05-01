ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpiry" TIMESTAMP(3);

-- Grandfather all existing accounts as verified so they aren't locked out
UPDATE "User" SET "emailVerified" = true;
