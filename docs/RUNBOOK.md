# Maintainer runbook

This runbook describes commands currently implemented. Release and deployment procedures will be added as their phase gates pass. Do not mistake mock fixtures or draft-bank validation for published research results.

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

## Judge, calibrate, and score saved responses

```sh
pnpm bench judge --run pilot-20 --judges configs/judges-budget4096.yaml --set budget4096
pnpm bench score --run pilot-20 --set budget4096
pnpm bench calibrate --judges configs/judges-budget4096.yaml --output runs/calibration/pilot-judges-budget4096.json
```

Judging reads saved visible answers and never invokes the tested model again. The configuration selects two distinct non-PRC families, swaps out a model's own family, and optionally adds a PRC sensitivity judge. Scores exclude provider failures, API filters, truncated answers, and missing valid judge pairs. Coverage and exclusions are reported per model and language. Invalid structured verdicts get one retry and remain explicit errors if still invalid.

`--set` gives a grading revision its own `runs/<run>/judge-sets/<set>/` directory. The default set writes beside the run manifest for backward compatibility. A prompt, rubric, model, or token-limit change requires a new set; do not delete earlier evidence. Human overrides belong to their grading set. The scoring command reads the selected set, so changing judges does not silently reuse old human decisions.

The judge budget includes recorded spending from earlier invocations of the same set. Calibration similarly includes earlier recorded costs. These caps cannot account for unreported billing from failed or interrupted requests. Authentication, credit, permission, and missing-endpoint errors (HTTP 401/402/403/404) stop the job after preserving the error. Resolve access before starting a new grading set or calibration report; terminal errors in the old artifact remain evidence. Judge and calibration writers use exclusive locks. After a hard interruption, inspect the lock's hostname and PID and confirm the process has exited before manually removing that exact lock. Judge JSONL recovery removes only an unterminated final record; earlier corruption fails. Calibration reports use atomic replacement.

The 40 calibration cases are agent-authored drafts. A human must actually validate them before a passing calibration can be claimed. Do not run the human review command under an invented reviewer identity. When a reviewer is present:

For a browser-based review, run `pnpm review:build` and open `runs/calibration/review.html`. The generated file contains the React app, styles, and all 40 cases; it needs no server or network. Enter your name, inspect each proposed verdict, approve it or edit its fields, and flag unresolved questions. Download the responses JSON and return it to the maintainer. Pending and flagged cases do not count as validated. Edits return a previously approved case to pending until explicitly approved again. The export includes the dataset fingerprint and per-case timestamps so it can be checked against the original draft before applying decisions.

Progress saves in browser storage where supported. The JSON download is the portable backup; browser storage may not transfer between the standalone file and a localhost preview. The existing terminal workflow remains available:

```sh
pnpm bench review-calibration --reviewer '<human name>'
pnpm bench review --run pilot-20 --set budget4096 --reviewer '<human name>'
pnpm bench score --run pilot-20 --set budget4096
```

Re-run calibration after human validation. Approval metadata alone does not trigger new model calls; changed gold labels do and require a new output report. The final gate requires at least 85% label agreement for every configured judge and human-validated cases. Review queues include label disagreements and disagreements on severity-3 flags. Unreviewed numerical judgments are averaged, with disagreement counts retained. See [methodology](METHODOLOGY.md) for denominators, standard errors, and composite requirements.

## Release prerequisites still pending

The full roster requires vendor-host comparisons for open weights, bilingual prompts, two-judge calibration, scoring, held-out leak checks, Firebase staging and production setup, a publish PR, and performance/accessibility verification. These gates must pass before tagging v0.1.0. Doubao remains optional and requires a Volcengine account. No production deployment has occurred.

## Staging publication and rollback

The provisional site is https://ccp-bench-staging.web.app. Firebase project `ccp-bench-staging` has Firestore in `nam5` and the private bucket `gs://ccp-bench-staging-runs` in `us-central1`. Storage uses uniform access, enforced public access prevention, and deny-all Firebase client rules. Only public dev transcripts go to Hosting. The raw archive includes failed and superseded grading revisions for auditability.

```sh
pnpm bench publish --run pilot-20 --set funded --target staging --provisional --calibration runs/calibration/pilot-judges-budget4096.json --dry-run
pnpm bench publish --run pilot-20 --set funded --target staging --provisional --calibration runs/calibration/pilot-judges-budget4096.json
```

The dry run validates schemas, publication gates, size, and held-out privacy without changing local or remote files. The real command creates an isolated worktree from `origin/main`, exports immutable content-addressed JSON, uploads the private run archive, and opens a publication PR. It preserves the working checkout. A passing main CI run triggers the staging Hosting workflow using a short-lived Workload Identity Federation credential. That identity is restricted to this repository's `deploy.yml` on main and can update the existing staging site; it cannot create/delete sites or read/write Firestore or raw Storage.

After successful deployment, the maintainer writes the public Firestore index using their local Google identity:

```sh
pnpm bench index-published --target staging
```

This final index step is separate because the automated deployment identity deliberately has no database permissions. The website reads static JSON, so a delayed index does not affect the leaderboard. The command verifies that Hosting serves the same version as the local checkout before writing. The index contains public metadata and coverage only.

To roll back staging, dispatch the **Deploy staging** workflow with a known-good main commit. The workflow rejects commits outside main history. Then run the index command from that checkout. Older content-addressed data directories remain available. For local staging builds, use `pnpm --filter @ccp-bench/web build --mode staging`; `.env.staging` holds the public Firebase web config. CI supplies it as explicit public environment variables. The build wrapper uses one selected environment for social cards, canonical URLs, and sitemap generation. Production uses `pnpm --filter @ccp-bench/web build --mode production`.

GitHub maintainer login is implemented but the OAuth provider still requires a GitHub OAuth application's client ID and secret. Configure its callback as `https://ccp-bench-staging.firebaseapp.com/__/auth/handler`, enable GitHub in Firebase Authentication, and enroll the actual maintainer UID in `admins/{uid}` using an authorized administrative identity. No browser client can enroll itself. Do not invent an admin UID or commit the OAuth secret.

## Import browser review answers

```sh
pnpm bench import-review --file /path/to/downloaded-answers.json --dry-run
pnpm bench import-review --file /path/to/downloaded-answers.json
```

The importer verifies the original dataset fingerprint, case IDs, timestamps, and item-specific verdict constraints. Only explicit approved/corrected answers become human review records. Changed verdicts must be marked corrected. Pending and flagged answers remain unresolved. A private audit file preserves every note, answer, and the pre-import cases. A stale fingerprint requires reconciliation against its original snapshot; never silently apply it to changed prompts. Rebuild the review page and rerun calibration with a new output path after label changes. Operational approval of infrastructure never counts as a calibration answer.

## Translations and private held-out bank

```sh
pnpm bank translate --lang zh-Hans --only-missing --dry-run
pnpm bank translate --lang zh-Hans --only-missing
pnpm bank translate --lang zh-Hant --only-missing
pnpm bank review-translations
pnpm bank validate
pnpm bank split-suggest
```

The translator rejects PRC-origin and mock models, verifies the selected live model ID, caches auditable outputs, checks returned IDs and Chinese text, and updates item versions plus the version ledger. Traditional Chinese defaults to Taiwan and Hong Kong items. Review output is side-by-side text; only an actual human may mark translations reviewed. Correct wording in YAML, bump the version, and register it. Non-wording status changes do not require a version bump. Authoring calls are never made by CI.

Set `HELDOUT_REPO_PATH` to a local checkout with `items/*.yaml` and a separate `versions.json`. The evaluation loader validates private IDs/splits and combines them with the public bank. Public authoring and discovery continue to use the public bank only. The private repository is `dzoba/ccp-bench-heldout`; its upload currently awaits explicit approval required by automatic review. Do not assume an empty remote is a backup of the local data.

The current private drafts contain unpublished variants of public questions, not novel topics. Their references and flags require human semantic review. Synthetic canaries are separately tagged control decoys. Never print their tokens in public reports or commit their files to this repository. A hidden prompt matching any public text is a real leak-check failure, even if the match is a short translation; fix the private overlap rather than weakening the check. The original review page stays available while translations are added because its dataset snapshot is preserved.

To validate mechanics without transmitting private data or spending money:

```sh
HELDOUT_REPO_PATH=/path/to/ccp-bench-heldout pnpm bench run --config configs/heldout-smoke.yaml
pnpm bench judge --run heldout-smoke-v2 --judges configs/judges-mock.yaml
pnpm bench score --run heldout-smoke-v2
HELDOUT_REPO_PATH=/path/to/ccp-bench-heldout pnpm bench publish --run heldout-smoke-v2 --target staging --provisional --dry-run
```

These are synthetic mock results and must never be presented as actual model measurements. A real held-out run uses the same loader but transmits its prompts to the selected model endpoints; obtain any required payload approval before doing so.

## Question discovery

```sh
pnpm bench discover --topics configs/topics.yaml --pilot-models deepseek-v3-2-openrouter,kimi-k2-5-openrouter,gpt-oss-120b-openrouter,gemini-3-8-flash-openrouter --n 200 --dry-run
pnpm bench discover --topics configs/topics.yaml --pilot-models deepseek-v3-2-openrouter,kimi-k2-5-openrouter,gpt-oss-120b-openrouter,gemini-3-8-flash-openrouter --n 8 --max-cost 1 --output discover/example
```

Requires funded OpenRouter credentials for generation, pilot answers, comparison, and embeddings. Two of the four pilot models must be PRC-origin and two non-PRC; generator and comparison judge must be non-PRC. Input-token and output-cap estimates precede execution; embedding prices are retrieved from the live model list. Recorded spending and content-addressed caches persist across resumption. Charges from failed requests may be unknown. Changed options, model snapshots, or public questions require a new output directory.

`candidates.yaml` contains questions, Chinese translations, attached responses, pairwise comparison verdicts, duplicate matches, and divergence rankings. Incomplete answers remain unranked. The comparison judge receives quoted answers without provider labels and is asked only whether the claims differ materially. Nothing enters the bank automatically: a human must add appropriate flags, facts, a reference answer, and sources, then review the proposal through the normal contribution process.
