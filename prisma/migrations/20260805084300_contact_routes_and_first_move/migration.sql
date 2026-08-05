-- Additive business fields; LangGraph checkpoint tables are managed by PostgresSaver.
ALTER TABLE "prospect_accounts"
ADD COLUMN "contactRoutes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "firstMoveDraft" JSONB;
