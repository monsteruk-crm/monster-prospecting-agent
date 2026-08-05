# Knowledge retrieval and first-move evaluation

Date: 2026-08-05

The checked-in evaluation set is `tests/fixtures/knowledge-evaluation.json`. It contains ten synthetic, source-grounded cases covering exact matches, paraphrase risks, product comparison, operational authority, no-result behavior, family-leisure fit, product overview, event format, venue/staffing fit and first-move support. It is a small regression set, not a substitute for a production evaluation dataset.

Run the deterministic retrieval evaluation with:

```bash
npm run knowledge:evaluate
```

Run the same three cases through the configured interpretation model with:

```bash
npm run knowledge:evaluate -- --live
```

The live mode does not persist missions, drafts, contacts or CRM records. It reports only schema validity, evidence grounding, expected channel, actionable ask, required-term presence and the aggregate rubric score.

## 2026-08-05 baseline result

- Retrieval hit@3: `0.70` (7/10 cases) in the expanded lexical baseline.
- Mean expected-section recall: `0.60` in the expanded lexical baseline.
- First-move model cases: 3/3 schema-valid; the latest run scored `0.80`, `1.00` and `0.80` (mean `0.867`) on the deterministic proxy rubric.
- All three drafts passed evidence grounding and actionable-ask checks. One selected a different channel than the label, and one did not include the required `space` term.

The venue/staffing case returned the authoritative venue-fit section but not the authoritative staffing section in its top three results. The paraphrase-paid-attraction, paraphrase-touring-operator and product-comparison cases also missed their expected sections, which makes the lexical limitation visible without claiming universal failure. Human judgment fields are intentionally deferred in the fixture; the review protocol remains in [human-judgment-sheet.md](human-judgment-sheet.md). The rubric is intentionally narrow: it checks contract and provenance properties, not whether a human salesperson considers the wording commercially excellent. Do not select vector infrastructure until the expanded baseline and human scores are reviewed.
