import { describe, expect, it } from "vitest";

import { evaluateFirstMoveBrief } from "@/lib/evaluation/first-move-evaluation";

describe("first-move usefulness rubric", () => {
  it("rewards grounded, actionable drafts on the expected route", () => {
    const result = evaluateFirstMoveBrief({
      subject: "A question about your event",
      opening: "I saw the event announcement.",
      whyNow: "It looks timely for your event programme.",
      ask: "Would you be open to a short conversation about the event?",
      recommendedChannel: "ROLE_ROUTE",
      evidenceIds: ["evidence-1"],
      status: "DRAFT",
    }, { expectedChannel: "ROLE_ROUTE", expectedEvidenceIds: ["evidence-1"], requiredTerms: ["event"] }, ["evidence-1"]);

    expect(result).toMatchObject({ schemaValid: true, evidenceGrounded: true, channelUseful: true, askActionable: true, requiredTermsPresent: true, score: 1 });
  });

  it("fails the grounding check for fabricated evidence IDs", () => {
    const result = evaluateFirstMoveBrief({
      subject: "A question",
      opening: "I saw your announcement.",
      whyNow: "This may be timely.",
      ask: "Would you be open to a conversation?",
      recommendedChannel: "ROLE_ROUTE",
      evidenceIds: ["made-up-evidence"],
      status: "DRAFT",
    }, { expectedChannel: "ROLE_ROUTE", expectedEvidenceIds: ["evidence-1"] }, ["evidence-1"]);

    expect(result.evidenceGrounded).toBe(false);
  });
});
