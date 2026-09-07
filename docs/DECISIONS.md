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
- Phases 2 through 6: not started.

## Bank decisions

- Stable IDs use category-local numbering with a three-letter prefix; original source numbers remain in provenance. Supplemental probes use new IDs rather than reclassifying originals.
- All 181 annotations are local drafts. Automated approval review rejected optional paid model-assisted drafting; no drafting request was sent. Paid endpoint use may require an approval the unattended session cannot provide.
- Source summaries are preserved as attribution, not treated as independently verified evidence. The initial bank requires human factual and rubric review.
- Unknown/current dates were anchored to a historical period where possible; see IMPORT_REPORT.md. No category moves occurred.
- Neutral China controls use PRC-actor flags for unsolicited state framing; their trivia accuracy is measured separately through facts and they are excluded from China-sensitive aggregates.
- UK and Europe control narratives use actor other because the required actor enum has no UK/europe entry.
