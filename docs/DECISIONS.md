# Decisions

- Runtime: Node 22 or newer, pnpm 10, TypeScript strict mode across all packages.
- CLI: Commander, for explicit subcommands and validated options.
- Commit hooks: Lefthook, for a small, declarative pre-commit configuration.
- Validation: Zod 4, including its native JSON Schema generator.
- Frontend: React 19, Vite, Tailwind 4. The owner's follow-up confirms React and Vite.
- Account assumptions: public repository `dzoba/ccp-bench`, private repository `dzoba/ccp-bench-heldout`, and maintainer `chris@dzoba.com`, inferred from authenticated accounts. No existing unrelated Cloud project will be reused.
- Firebase project names: try `ccp-bench-staging` and `ccp-bench-prod`; use the production Hosting domain unless an existing benchmark domain is discovered.
- Questions: the owner's instruction to proceed without questions overrides the directive's ask-owner steps. Record assumptions and evidence rather than waiting for replies.
- Paid endpoints: use the existing OpenRouter credential for required small validation runs. Estimate and record the full roster cost before executing it. Do not infer availability of vendor keys.
- Third PRC judge: omit from the v0.1 headline pipeline; implement optional sensitivity support.
- Acceptance evidence: never manufacture published-result agreement, human calibration, CI status, or unavailable API access. Preserve unresolved gates explicitly.

## Phase status

- Phase 0: complete. Clean-clone acceptance commands pass. GitHub CI run 34138788428 succeeded on commit 9357416. The initial commit established main; subsequent phases use scoped PRs.
- Phase 1: acceptance passes locally. 181 draft items validate across all 24 categories; stats print; ITEM_SCHEMA.md is generated from Zod. Nine bank tests cover source completeness, privacy boundaries, actors, contested flags, translation status, and version history.
- Phase 2: acceptance passes. Real 10-item DeepSeek V3.2 and GPT-OSS-120B run resumed from 5 to 20 samples with zero errors or truncations; see PHASE_2_VALIDATION.md.
- Phase 3: judge/scoring implementation and 37 local tests pass. Funded pilot grading completed with one invalid verdict and one excluded model truncation. All three judges exceed 85% agreement against draft calibration labels, but human validation remains pending. Kimi did not reproduce the expected Western-model similarity, so the published-direction acceptance criterion has not passed. The owner requested a standalone HTML review tool, which is implemented. See PHASE_3_VALIDATION.md.
- Phases 4 through 6: not started, respecting the directive's sequential acceptance gates.

## Bank decisions

- Stable IDs use category-local numbering with a three-letter prefix; original source numbers remain in provenance. Supplemental probes use new IDs rather than reclassifying originals.
- All 181 annotations are local drafts. Automated approval review rejected optional paid model-assisted drafting; no drafting request was sent. Paid endpoint use may require an approval the unattended session cannot provide.
- Source summaries are preserved as attribution, not treated as independently verified evidence. The initial bank requires human factual and rubric review.
- Unknown/current dates were anchored to a historical period where possible; see IMPORT_REPORT.md. No category moves occurred.
- Neutral China controls use PRC-actor flags for unsolicited state framing; their trivia accuracy is measured separately through facts and they are excluded from China-sensitive aggregates.
- UK and Europe control narratives use actor other because the required actor enum has no UK/europe entry.

## Runner decisions

- Maximum output: 4096 tokens in smoke and the small API validation, 8192 in provisional roster defaults. Exclude truncations from future scoring and raise limits when pilots show truncation.
- Cache: content hash includes provider base URL, model, parameters, system prompt, and messages. A separate sample-index slot preserves independent sampling draws while retaining cross-run caching. A single shared cache entry would incorrectly turn three samples into one.
- API filters: explicit provider filter errors and finish reasons use filter_layer api. Textual refusals use none. Unknown operational errors use unknown. Do not infer a filter from the answer's wording.
- Cost: prefer provider-reported cost, otherwise use snapshotted per-token prices. Output usage includes reasoning tokens once. Timeouts and malformed responses may have unknown charges; estimates are not hard account-level budget controls.
- Resume: serialize durable JSONL writes, reconstruct totals from records, retain terminal failures, and repair only incomplete final lines. Host-and-PID locks prevent simultaneous writers.
- Providers: generic OpenAI-compatible transport plus dedicated Anthropic and Google transports. No paid requests are made by tests or CI.
- Roster: preserve named historical models for pilot comparisons and include live-catalog latest models separately. Vendor dates, remaining developer sampling recommendations, and pinned underlying hosts remain release prerequisites.
- Phase 2's required paid acceptance run was approved as explicitly authorized by the directive. This does not erase the earlier rejection of optional paid bank authoring.

## Owner direction, 2026-09-07

The owner explicitly asked to continue all remaining implementation while human calibration review is pending, and to incorporate commentary when supplied. This supersedes the sequential wait on Phase 3 and the expected-ranking gate. Empirical results stay unchanged and provisional; software development, staging, translations, discovery, and full evaluation may proceed. Human validation is never inferred. Validated publication still requires actual reviewed calibration; a clearly labeled provisional staging export is allowed.

## Phase 5 decisions

- Public questions are already exposed, so `split-suggest` is a deterministic proposal only. New private drafts use unpublished paraphrases with the same public topics/rubrics; they must not be described as unseen-topic evaluation.
- Target the 30% held-out ratio with 75 private paraphrase drafts plus three synthetic canary decoys alongside 181 public items (78/259, 30.1%). All remain draft research data.
- Generate public translations with Claude Sonnet 5 through the funded OpenRouter account, retaining model/input/output/cost audit records privately. Mark every translation machine until a human reviews it.
- Translate private drafts in the existing OpenAI coding session after automatic review rejected sending them to a separate translation endpoint. Canary values are substituted into a locally authored Chinese template. Record the distinct provenance rather than claiming Claude translated them.
- Preserve the original calibration review dataset by fingerprint. Translation-only additions and item-version bumps do not invalidate an in-progress English review; changes to English evidence or gold labels require reconciliation.
- Discovery uses all 24 category seeds plus six extensible long-tail seeds. It generates 8–10 questions per batch and deduplicates against public dev questions and prior candidates at cosine similarity 0.9.
- Discovery combines half the normalized PRC/non-PRC centroid cosine distance and half the fraction of cross-cohort answer pairs judged materially different. This measures disagreement, not correctness or benchmark performance.
- Use `openai/text-embedding-3-small` through OpenRouter, verifying the live embedding model list and recording its price/model snapshot. Long responses use mean-pooled 4,000-character chunks instead of silent truncation. Endpoint documentation: https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings and https://openrouter.ai/docs/api/api-reference/embeddings/list-embeddings-models.
- Candidates and their responses remain under ignored `discover/`. No discovery command adds items, flags, facts, sources, or human approval to the benchmark bank.
