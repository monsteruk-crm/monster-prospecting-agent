ALTER TABLE "sales_mission_runs"
  ADD COLUMN "settingsVersion" INTEGER,
  ADD COLUMN "settingsSnapshot" JSONB;

CREATE TABLE "scout_settings" (
  "id" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "settings" JSONB NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scout_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scout_settings_revisions" (
  "id" TEXT NOT NULL,
  "settingsId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "settings" JSONB NOT NULL,
  "changedBy" TEXT,
  "changeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scout_settings_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scout_settings_revisions_settingsId_version_key" ON "scout_settings_revisions"("settingsId", "version");
ALTER TABLE "scout_settings_revisions" ADD CONSTRAINT "scout_settings_revisions_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "scout_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_usage_events" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "missionId" TEXT,
  "missionRunId" TEXT,
  "accountId" TEXT,
  "operation" TEXT NOT NULL,
  "modelRole" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "provider" TEXT,
  "status" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "totalTokens" INTEGER,
  "reportedCostUsd" DECIMAL(12,6),
  "estimatedCostUsd" DECIMAL(12,6),
  "costSource" TEXT NOT NULL,
  "latencyMs" INTEGER,
  "traceId" TEXT,
  "errorCode" TEXT,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_usage_events_idempotencyKey_key" ON "ai_usage_events"("idempotencyKey");
CREATE INDEX "ai_usage_events_missionRunId_createdAt_idx" ON "ai_usage_events"("missionRunId", "createdAt");
CREATE INDEX "ai_usage_events_modelId_createdAt_idx" ON "ai_usage_events"("modelId", "createdAt");
CREATE INDEX "ai_usage_events_operation_createdAt_idx" ON "ai_usage_events"("operation", "createdAt");
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
