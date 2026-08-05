import { readFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

import { evaluateFirstMoveBrief } from "../lib/evaluation/first-move-evaluation";
import { draftFirstMove, type FirstMoveInput } from "../lib/chains/first-move";
import { retrieveIngestedKnowledge } from "../lib/knowledge/retriever";
import type { FirstMoveBrief } from "../lib/sales/contact-schema";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

type EvaluationCase = {
  id: string;
  retrievalQuery: string;
  expectedSectionIds: string[];
  allowNoResult?: boolean;
  firstMoveInput: FirstMoveInput | null;
  firstMoveLabel: { expectedChannel: FirstMoveBrief["recommendedChannel"]; expectedEvidenceIds: string[]; requiredTerms?: string[] } | null;
  humanJudgment: { status: "PENDING" | "COMPLETE"; reviewer: string | null; usefulnessScore: number | null; groundingScore: number | null; notes: string };
};

const cases = JSON.parse(await readFile(path.join(process.cwd(), "tests/fixtures/knowledge-evaluation.json"), "utf8")) as EvaluationCase[];
const retrievalResults = cases.map((evaluationCase) => {
  const results = retrieveIngestedKnowledge({ query: evaluationCase.retrievalQuery, maxResults: 3, maxCharacters: 3600 });
  const returnedIds = results.map(({ chunk }) => chunk.sectionId);
  const hits = evaluationCase.expectedSectionIds.filter((id) => returnedIds.includes(id));
  const noResultAccepted = evaluationCase.allowNoResult === true && returnedIds.length === 0;
  return { id: evaluationCase.id, hit: noResultAccepted || hits.length > 0, recall: evaluationCase.expectedSectionIds.length ? hits.length / evaluationCase.expectedSectionIds.length : (noResultAccepted ? 1 : 0), returnedIds };
});

console.log(JSON.stringify({ retrieval: retrievalResults, retrievalCases: retrievalResults.length, retrievalHitAt3: retrievalResults.filter((result) => result.hit).length / retrievalResults.length, retrievalMeanExpectedSectionRecall: retrievalResults.reduce((sum, result) => sum + result.recall, 0) / retrievalResults.length, humanJudgmentsPending: cases.filter((evaluationCase) => evaluationCase.humanJudgment.status === "PENDING").length }, null, 2));

if (process.argv.includes("--live")) {
  const firstMoveResults = [];
  for (const evaluationCase of cases) {
    if (!evaluationCase.firstMoveInput || !evaluationCase.firstMoveLabel) continue;
    try {
      const draft = await draftFirstMove(evaluationCase.firstMoveInput);
      const result = evaluateFirstMoveBrief(draft, evaluationCase.firstMoveLabel, evaluationCase.firstMoveInput.evidence.map((evidence) => evidence.id));
      firstMoveResults.push({ id: evaluationCase.id, ...result });
    } catch (error) {
      firstMoveResults.push({ id: evaluationCase.id, error: error instanceof Error ? error.message : "UNKNOWN_ERROR" });
    }
  }
  console.log(JSON.stringify({ firstMove: firstMoveResults }, null, 2));
} else {
  console.log("First-move model evaluation skipped. Re-run with --live after configuring the approved model registry.");
}
