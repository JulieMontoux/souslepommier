-- Add username as nullable first
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Fill from email (part before @), fallback to id
UPDATE "users" SET "username" = COALESCE(split_part("email", '@', 1), "id") WHERE "username" IS NULL;

-- Make NOT NULL and add unique constraint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");

-- Make email nullable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
