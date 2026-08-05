-- CreateTable
CREATE TABLE "sales_missions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "productFocus" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_mission_runs" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "graphVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "discoveryStage" TEXT NOT NULL,
    "targetProfile" JSONB NOT NULL,
    "searchStrategy" JSONB NOT NULL,
    "budget" JSONB NOT NULL,
    "searchResults" JSONB NOT NULL,
    "evidenceIds" JSONB NOT NULL,
    "accountIds" JSONB NOT NULL,
    "buyingSignalIds" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sales_mission_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_accounts" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "officialDomain" TEXT,
    "website" TEXT,
    "country" TEXT,
    "city" TEXT,
    "categories" JSONB NOT NULL,
    "relevanceHypothesis" TEXT NOT NULL,
    "discoveredSignals" JSONB NOT NULL,
    "possibleBuyerRoles" JSONB NOT NULL,
    "discoveryEvidenceIds" JSONB NOT NULL,
    "unresolvedQuestions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospect_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_evidence" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "accountId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "finalUrl" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "title" TEXT,
    "readableExcerpt" TEXT NOT NULL,
    "byteCount" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "redirectCount" INTEGER NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buying_signals" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "freshness" TEXT NOT NULL,
    "evidenceState" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "verificationReason" TEXT NOT NULL,
    "evidenceExcerpt" TEXT NOT NULL,
    "sourceContentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buying_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_reviews" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "decision" JSONB,
    "reviewer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "mission_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_audit_events" (
    "idempotencyKey" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "missionRunId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_mission_runs_missionId_startedAt_idx" ON "sales_mission_runs"("missionId", "startedAt");

-- CreateIndex
CREATE INDEX "prospect_accounts_missionRunId_idx" ON "prospect_accounts"("missionRunId");

-- CreateIndex
CREATE UNIQUE INDEX "prospect_accounts_missionId_accountKey_key" ON "prospect_accounts"("missionId", "accountKey");

-- CreateIndex
CREATE INDEX "mission_evidence_missionId_contentHash_idx" ON "mission_evidence"("missionId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "mission_evidence_missionRunId_contentHash_key" ON "mission_evidence"("missionRunId", "contentHash");

-- CreateIndex
CREATE INDEX "buying_signals_accountId_verified_freshness_idx" ON "buying_signals"("accountId", "verified", "freshness");

-- CreateIndex
CREATE UNIQUE INDEX "buying_signals_missionRunId_signalKey_key" ON "buying_signals"("missionRunId", "signalKey");

-- CreateIndex
CREATE UNIQUE INDEX "mission_reviews_missionRunId_key" ON "mission_reviews"("missionRunId");

-- CreateIndex
CREATE INDEX "mission_reviews_missionId_status_idx" ON "mission_reviews"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mission_audit_events_idempotencyKey_key" ON "mission_audit_events"("idempotencyKey");

-- CreateIndex
CREATE INDEX "mission_audit_events_missionId_occurredAt_idx" ON "mission_audit_events"("missionId", "occurredAt");

-- CreateIndex
CREATE INDEX "mission_audit_events_missionRunId_occurredAt_idx" ON "mission_audit_events"("missionRunId", "occurredAt");

-- AddForeignKey
ALTER TABLE "sales_mission_runs" ADD CONSTRAINT "sales_mission_runs_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_accounts" ADD CONSTRAINT "prospect_accounts_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_accounts" ADD CONSTRAINT "prospect_accounts_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidence" ADD CONSTRAINT "mission_evidence_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidence" ADD CONSTRAINT "mission_evidence_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_evidence" ADD CONSTRAINT "mission_evidence_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "prospect_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_signals" ADD CONSTRAINT "buying_signals_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_signals" ADD CONSTRAINT "buying_signals_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_signals" ADD CONSTRAINT "buying_signals_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "prospect_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buying_signals" ADD CONSTRAINT "buying_signals_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "mission_evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_reviews" ADD CONSTRAINT "mission_reviews_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_reviews" ADD CONSTRAINT "mission_reviews_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_audit_events" ADD CONSTRAINT "mission_audit_events_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "sales_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_audit_events" ADD CONSTRAINT "mission_audit_events_missionRunId_fkey" FOREIGN KEY ("missionRunId") REFERENCES "sales_mission_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
