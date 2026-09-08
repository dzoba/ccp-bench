# Full public-bank evaluation

This expansion evaluates the existing 181 public questions with the six models already on the site, using one draw for each available language: 388 prompt variants and 2,328 responses. The original 264 responses and 526 judge records are reused only after regenerated request hashes, item versions, and complete cache objects match. All reused judge input hashes are checked again before new grading calls. This does not create a separately validated American-narrative rubric.

Operational caps: $10 for response generation and $20 for judging, including the $1.114539252 historical judge cost carried forward. New spending therefore has less than $30 available. Use `--budget-limited` to permit a resumable partial workload when the all-outputs-at-maximum estimate exceeds these caps; the default preflight rejection remains unchanged.

Persistent per-request budgets reserve a conservative UTF-8 input bound plus the configured maximum output before each attempt. Concurrent calls share reservations, and retries reserve again. Reported costs replace successful reservations; unknown failed calls retain their reservation conservatively. Interrupted reservations remain counted after restart. Provider invoices remain authoritative if provider-reported usage or pricing differs. Cached answers do not consume new generation budget.

Commands:

```sh
pnpm bench run --config configs/public-six-models.yaml --budget-limited --concurrency 32
pnpm bench judge --run public-six-models-v1 --judges configs/judges-public-six-models.yaml --set initial --concurrency 64 --budget-limited
```

Judging may process completed responses while generation continues, then resume to collect the remainder. Publication requires the final complete response manifest, scoring, schema checks, and held-out leak scans. Failures and filtering remain visible in coverage; human calibration is still pending, so publication remains provisional.

Generation concurrency can be overridden operationally without changing the request parameters or frozen run configuration. Each execution records the override and source Git revision in a private execution-events ledger. The first process was drained gracefully before resuming at 32 concurrent requests.

After generation completes, grading can use up to 64 concurrent requests under the same budget. The existing grading pass is allowed to finish before the replacement coordinator starts; writer locks prevent overlapping writers.

## Completed public run — September 7, 2026

Run `public-six-models-v1` completed all 2,328 unique response records: 388 available language variants per model, with 264 verified cached responses and 2,064 new responses. Grading completed 4,636 unique judge records, including the 526 reused records. There are 105 judge errors affecting 97 answers, nine API-filtered answers, and one truncated answer. Scoring includes 2,221 answers and excludes those 107 answers; exclusions are never assigned a zero score.

All 181 public questions have published results. Usable scored question coverage varies by model: DeepSeek 179, GPT-OSS 180, Kimi 180, Qwen 179, Claude 181, and Gemini 178. The run remains provisional: human calibration is pending, there are no held-out items, and at least one model exceeds the 2% judge-error threshold. The grading review queue contains 498 entries and does not imply human approval.

New provider-reported generation cost was $5.682149158. Total recorded judging cost was $10.218457586, including $1.114539252 carried forward from the pilot. New reported API cost was therefore **$14.786067492**. The account balance decreased by **$15.275417119** between the baseline and the final check, leaving **$21.743262435** at 03:10 UTC on September 8. Balance changes include any account activity in that interval and provider billing is authoritative. The durable ledgers retain $0.341956912 of uncertain reservations and have no active reservations.

The schema-validated, held-out-scanned export contains 190 files totaling 12,672,452 bytes. Its immutable version is `0.1.0-dev-public-six-models-v1-initial-014499d4852f`. Raw responses, judgments, scores, reuse provenance, execution records, budget ledgers, and cost reconciliation are archived under `gs://ccp-bench-staging-runs/runs/public-six-models-v1/`.

The Items page displays 30 questions initially and supports showing more; changing a filter resets that limit. The homepage continues to show descriptive narrative alignment rather than a normative better/worse ranking. Build, CI, and mobile rendering checks cover the expanded dataset; no human-review answers were fabricated or overwritten.
