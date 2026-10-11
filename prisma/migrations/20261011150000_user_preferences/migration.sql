-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "palette" TEXT NOT NULL DEFAULT 'classic',
    "nudgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "nudgeHour" INTEGER NOT NULL DEFAULT 21,
    "ntfyTopic" TEXT,
    "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_ntfyTopic_key" ON "UserPreference"("ntfyTopic");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

