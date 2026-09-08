# Six-model homepage pilot

The homepage explains the benchmark in one sentence and compares three China-origin models (DeepSeek V3.2, Qwen3 235B, Kimi K2.5) with three US-origin models (Gemini 3.8 Flash, GPT-OSS 120B, Claude Sonnet 5). The vertical chart uses the published composite scores, developer-origin colors, and standard-error whiskers. Detailed filters, evidence, and limitations remain at /results and on model pages.

Run pilot-six-models-v1 uses the same 20 public items, available English/Simplified/Traditional prompts, and recorded temperature-zero settings as the preceding pilot. All 264 responses completed: 132 exact cached responses and 132 new responses, no provider errors or truncations, and one preserved API filter. Reported new generation cost: $0.637175.

The 262 original judge records, including five errors, were reused only after exact request-hash and full-response-object equality checks. A provenance audit records the source file SHA-256 and historical cost. The judging pipeline additionally validates each reused input hash before scheduling new calls. New judging cost: $0.441495; the summary total includes $0.673045 of historical reused judgments.

Final grading: 526 records, 11 errors, 51 review cases. Scoring includes 252 observations; one filtered response and eleven responses without valid judge pairs are excluded. The prior three composite estimates are exactly unchanged; component metrics agree within 1e-12 floating-point tolerance. No human validation or full-roster research release is claimed.

The provisional export passes schemas and held-out leak scans: 190 files, 1,944,340 bytes, version 0.1.0-dev-pilot-six-models-v1-initial-c565cadef697. Human review is pending; no held-out research items are included; judge errors exceed the validated-release threshold for at least one model.
