import { FirstMoveBriefSchema, type FirstMoveBrief } from "@/lib/sales/contact-schema";

export type FirstMoveEvaluationLabel = {
  expectedChannel: FirstMoveBrief["recommendedChannel"];
  expectedEvidenceIds: string[];
  requiredTerms?: string[];
};

export type FirstMoveEvaluation = {
  schemaValid: boolean;
  evidenceGrounded: boolean;
  channelUseful: boolean;
  askActionable: boolean;
  requiredTermsPresent: boolean;
  score: number;
};

export function evaluateFirstMoveBrief(
  value: unknown,
  label: FirstMoveEvaluationLabel,
  allowedEvidenceIds: string[],
): FirstMoveEvaluation {
  const parsed = FirstMoveBriefSchema.safeParse(value);
  if (!parsed.success) {
    return { schemaValid: false, evidenceGrounded: false, channelUseful: false, askActionable: false, requiredTermsPresent: false, score: 0 };
  }

  const brief = parsed.data;
  const allowed = new Set(allowedEvidenceIds);
  const expected = new Set(label.expectedEvidenceIds);
  const evidenceGrounded = brief.evidenceIds.length > 0 && brief.evidenceIds.every((id) => allowed.has(id)) && brief.evidenceIds.some((id) => expected.has(id));
  const text = `${brief.opening} ${brief.whyNow} ${brief.ask}`.toLowerCase();
  const requiredTermsPresent = (label.requiredTerms ?? []).every((term) => text.includes(term.toLowerCase()));
  const askActionable = /\?|explore|discuss|confirm|share|review|schedule|speak|point me/i.test(brief.ask) && brief.ask.length >= 12;
  const checks = [true, evidenceGrounded, brief.recommendedChannel === label.expectedChannel, askActionable, requiredTermsPresent];

  return {
    schemaValid: true,
    evidenceGrounded,
    channelUseful: brief.recommendedChannel === label.expectedChannel,
    askActionable,
    requiredTermsPresent,
    score: checks.filter(Boolean).length / checks.length,
  };
}
