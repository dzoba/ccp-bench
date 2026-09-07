# Maintainer runbook

This runbook describes commands currently implemented. Release, judging, and deployment procedures will be added as their phase gates pass. Do not mistake mock fixtures or draft-bank validation for published research results.

## Environment

Install Node 22+ and pnpm 10, then run `pnpm install --frozen-lockfile`. Export credentials from the shell or a secret manager; `.env.example` documents their names. Never commit a populated environment file. The CLI reads exported environment variables. Google Cloud credentials do not supply third-party model API credentials.

The generic adapter supports OpenRouter, OpenAI-compatible vendor APIs, Together, Fireworks, and vLLM. Anthropic and Google use dedicated adapters. Custom registry endpoints must specify `base_url` and `key_env`. Base URLs must not contain credentials or query strings. vLLM uses `VLLM_BASE_URL` and optionally `VLLM_API_KEY`.

## Bank maintenance

```sh
pnpm bank validate
pnpm bank stats
pnpm bank schema
```

Edit category YAML files rather than rerunning the initial authoring scripts. Increment versions for prompt, flag, or fact changes, then run `pnpm bank register-versions`. Retain retired IDs. Human source review is still pending for the initial drafts.

## Runner smoke test

```sh
pnpm bench run --config configs/smoke.yaml --stop-after 5
pnpm bench run --config configs/smoke.yaml
```

The first command simulates an interruption after five new samples. The second resumes to 12 samples. This uses local fixtures and no paid API. CI runs both commands on every PR.

## Real model validation

```sh
pnpm bench models verify --config configs/real-10-gpt-oss.yaml
pnpm bench estimate --config configs/real-10-gpt-oss.yaml
pnpm bench run --config configs/real-10-gpt-oss.yaml --stop-after 5
pnpm bench run --config configs/real-10-gpt-oss.yaml
```

The original `configs/real-10.yaml` retains the Claude validation attempt, which returned HTTP 402. The validated configuration below requests 10 public dev items from DeepSeek V3.2 and GPT-OSS-120B through OpenRouter. It requires `OPENROUTER_API_KEY`. It is a small engineering validation, not a leaderboard release. The projection assumes 600 output tokens; the second estimate uses the configured output-token maximum. Neither includes judging or unknown billing from failed requests. The configured spending check compares the token-cap estimate with `max_cost_usd`; it is not an account-level billing limit.

All selected model IDs are checked against live provider lists before requests begin. An unavailable ID fails with the current list. Catalog availability dates are currently recorded provisionally in the registry's `release_date`; vendor release dates and the remaining recommended sampling settings must be verified before the full release run. OpenRouter routing can vary by upstream provider, so a controlled host comparison requires pinned hosting rather than treating the router as a single weight deployment.

## Artifacts, caching, and recovery

Runs write private local artifacts to `runs/<run_id>/manifest.json` and `responses.jsonl`. The manifest snapshots the bank, model registry, prices, config, Git SHA, timestamps, and totals. Requests have content hashes; the cache has separate slots for sampling draws. Refusals remain visible answers, API filters are marked separately, and truncated outputs retain their finish reasons for later exclusion from scoring.

The run ID defaults to a content-derived value, or can be specified in YAML. Reusing a run ID with changed inputs fails. A completed run does not query its completed samples again. To repeat inference, choose a new run ID and pass `--no-cache`. That flag bypasses both cache reads and writes.

SIGINT stops scheduling new work and finishes in-flight requests. A hard interruption can leave a lock; `pnpm bench unlock --run <run_id>` checks the recorded host and PID before removing it. Never remove a lock based on age alone. The runner recovers a partial final JSONL line, but rejects corruption in earlier records. A failed sample remains a recorded terminal outcome; use a new run ID to retry an evaluation, letting the cache reuse successful responses.

Provider errors are reported per sample. Billing for timeouts or malformed provider responses may be unknown and must be reconciled with provider invoices; do not interpret a recorded zero-token error as proof that the request was free.

## Release prerequisites still pending

The full roster requires vendor-host comparisons for open weights, bilingual prompts, two-judge calibration, scoring, held-out leak checks, Firebase staging and production setup, a publish PR, and performance/accessibility verification. These gates must pass before tagging v0.1.0. Doubao remains optional and requires a Volcengine account. No production deployment has occurred.
