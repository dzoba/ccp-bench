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
