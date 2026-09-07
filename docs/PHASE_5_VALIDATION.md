# Phase 5 validation

The public bank has 181 Simplified Chinese machine translations and 26 Traditional Chinese machine translations for Taiwan/Hong Kong. Reported Claude translation cost was approximately $0.1023. Original English wording, rubric content, source provenance, and version history are preserved. Human translation review remains pending.

A locally prepared private bank contains 75 unpublished paraphrase drafts plus three locally generated canary decoys, covering 78/259 combined items (30.1%). All 78 have Simplified Chinese; 11 Taiwan/Hong Kong items also have Traditional Chinese. The prompts share public topics/rubrics, so this is not unseen-topic evidence. Private translations were authored in the existing OpenAI coding session after a separate endpoint upload was rejected. The GitHub repository is verified private and owned by the authenticated maintainer, but uploading its payload awaits explicit approval from automatic review.

The evaluation loader reads this separate bank through `HELDOUT_REPO_PATH`. The public loader rejects held-out items. A deterministic category/type split suggestion is available without moving or retiring public data automatically.

Local integration run `heldout-smoke-v2`: 1,110 mock samples, 2,220 valid mock verdicts, zero errors or exclusions. Held-out items contribute to aggregates. Publication dry run produced 186 public JSON files (1,524,727 bytes) and passed hidden-ID, prompt, and canary scans. This validates mechanics only and was not deployed as model research. The prior v1 run is preserved: it caught a short translated prompt overlapping the public bank and a mock label-priority issue on decoys. Both were corrected without weakening the leak check or discarding the original evidence.

Automated tests cover the full hidden-item run/judge/score/export path, explicit review import and translation-only compatibility, stratified split determinism, and divergence mathematics. Real private prompts and canaries are never fixtures in public tests.

Discovery CLI implements public topic generation, bilingual four-model pilots, embedding deduplication, cross-cohort cosine distance, and a separate material-claims disagreement judgment. Candidate outputs remain ignored and require human annotation before entering the bank. A bounded live demonstration is in progress; it is not yet reported as completed.
