# Human usefulness judgment sheet

The evaluation fixture contains one `humanJudgment` object per case. All current entries are `PENDING`; no reviewer identity or score is fabricated. A human reviewer should complete them after reading the retrieved sections and, for the three first-move cases, the generated draft.

Use a 1–5 scale:

- `1` — unusable or misleading;
- `2` — materially weak or poorly grounded;
- `3` — usable with substantial editing;
- `4` — useful with minor editing;
- `5` — ready for human approval with minimal editing.

Record both `usefulnessScore` and `groundingScore`, plus a short note. Grounding means the retrieved passages support the positioning or operational context; usefulness means the result helps Nick decide or make a credible first move. A high proxy score does not replace these judgments.

The reviewer should pay particular attention to:

- paraphrased business language that may need semantic retrieval;
- checklist material outranking positioning material in operational questions;
- comparison answers keeping The Monster and Mega Bounce House distinct;
- no-result cases remaining explicitly ungrounded;
- first-move drafts using only supplied account evidence and public contact routes.
