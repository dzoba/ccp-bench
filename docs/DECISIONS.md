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

- Phase 0: local typecheck, tests, lint, formatting, and production build pass. GitHub CI and clean-clone verification pending.
- Phases 1 through 6: not started.
