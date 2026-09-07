# Phase 2 validation evidence

Validated on 2026-09-07. This is engineering evidence, not a scored benchmark release.

- Run: `real-10-gpt-oss`.
- Models: DeepSeek V3.2 and GPT-OSS-120B, both through OpenRouter and verified against the live catalog.
- Coverage: 10 dev items per model, English, one sample each, 20 distinct sample IDs.
- Interruption: stopped at 5/20, then resumed to 20/20 without repeating recorded samples.
- Result: zero provider errors, zero API filter responses, zero truncated answers.
- Visible answers and reasoning stored separately; reasoning was captured for 10 samples.
- New spend in this run: $0.005396317. Generation cost represented by all responses, including cached draws: $0.006859109.
- Eleven responses came from earlier validation caches. Those earlier API calls are preserved in their original private artifacts.
- The development run records its base Git SHA and `git_dirty: true`; release runs must use a committed revision. No raw responses are committed.
- Tests: 11 runner/provider tests plus nine bank tests and the workspace test passed; typecheck, lint, formatting, and production build passed.

## Endpoint limitations observed

The first Claude Sonnet 5 attempt returned HTTP 402 on all ten items. OpenRouter reported zero account credit. A free Gemma attempt returned HTTP 429 on nine items; a lower-concurrency retry still had errors and was gracefully stopped after GPT-OSS availability was established. These failed records were preserved and were not converted into successful observations. The full release roster still needs its own successful validation and funding/access resolution.
