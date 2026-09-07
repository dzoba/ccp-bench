# Phase 3 validation, 2026-09-07

Status: implementation is reviewable; the empirical acceptance gate remains unresolved. Do not publish these partial results as a leaderboard or claim reproduction of prior findings.

## Software evidence

The judge pipeline validates structured verdicts, assigns two distinct non-PRC families without self-family judging, supports an optional PRC sensitivity judge, records field/category agreement, and queues label or severity-3 disagreements for human review. Scoring uses saved artifacts exclusively, applies recorded human overrides, averages samples within items, and reports exclusions per model and language.

Hand-computed tests cover refusal, evasion, weighted narrative alignment, weighted omission, euphemisms, contested-as-settled rates, mean/SE, China-specificity differences, paired language/host gaps, the bilingual composite, Cohen's kappa, and embedding cosine distance. End-to-end fixtures check independent grading revisions and human override isolation. Writer-lock tests cover concurrent writers and cleanup after failure. HTTP 402 stops grading after one recorded failure rather than draining the remaining work queue.

All 35 workspace tests, type checking, root lint/format checks, and the production build pass, including the fail-fast refinement. No paid requests run in tests.

## Real artifacts

Private run `runs/pilot-20` contains 60 completed responses: 20 public English items each for DeepSeek V3.2, GPT-OSS-120B, and Kimi K2.5. There are zero provider failures or API filters and one truncated GPT response. Twenty responses came from the cache. Newly reported generation cost was $0.03031330525; this excludes charges already attributed to earlier cached generation.

The original grading set contains 38 records, 13 HTTP 402 errors, and $0.037308777 reported cost. Only six samples have complete valid judge pairs. Its separate calibration report contains 29 of 120 planned judgments, with $0.005912701 reported cost.

A diagnostic provider response showed an 8,192-token reservation exceeded the available balance. A separate `budget4096` grading revision reduced only Google's output cap to 4,096. Google initially returned valid verdicts, then HTTP 402 recurred, including on GPT-OSS. This revision contains 18 records, six errors, and $0.037552024 reported cost. Five errors are HTTP 402; one rejects an invalid contested-claim field. Only four samples have complete valid pairs. The revised calibration contains 13 of 120 judgments and $0.003185557 reported cost.

Both jobs were stopped after the credit errors recurred. Completed evidence is retained; in-flight requests at interruption may have additional unreported charges. No artifacts from different configurations were combined to manufacture coverage. Scoring the partial sets correctly reports missing judge pairs and the truncated sample.

## Unresolved acceptance

There is insufficient paired grading coverage to compare the three models. The required direction of published findings is neither confirmed nor rejected by this incomplete pilot. Raw model answers remain available for grading after endpoint access is restored; tested models need not be queried again.

The 40 calibration cases are explicitly agent-authored drafts. None has been reviewed by a human, and neither incomplete report claims a passing calibration. A real reviewer must validate the cases; all configured judges must then achieve at least 85% label agreement. The interactive commands and resume procedure are documented in RUNBOOK.md.

The directive prohibits beginning the next phase until the prior phase's acceptance criteria pass. Firebase publication and website implementation therefore remain pending. The scaffold already uses the requested React and Vite stack.
