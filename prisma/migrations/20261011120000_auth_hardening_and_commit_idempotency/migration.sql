-- Token revocation: API tokens carry the version they were issued with.
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- Idempotent pushes: clients may send a stable id per commit.
ALTER TABLE "Commit" ADD COLUMN "clientId" TEXT;
CREATE UNIQUE INDEX "Commit_userId_clientId_key" ON "Commit"("userId", "clientId");

-- Emails are now stored lower-cased and trimmed. If two accounts differ only by case this
-- statement fails on the unique index; merge or remove the duplicate account first.
UPDATE "User" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
