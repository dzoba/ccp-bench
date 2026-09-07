# Phase 4 implementation and staging validation

The owner's September 7 direction permits continued implementation and provisional publication while human calibration review is pending. No human decisions have been fabricated. The English pilot remains explicitly provisional; Kimi's observed divergence from the expected pattern is retained.

Implemented React/Vite routes: sortable/filterable leaderboard with uncertainty and components, public item explorer and transcripts, model detail, comparison and language views, methodology with pair/category agreement, sources, changelog, about, maintainer dispute queue, and 404. Empty bilingual/composite results are marked unmeasured. Fonts are self-hosted. Mobile navigation, skip link, page titles, social PNG, icons, robots, sitemap, and dark mode are included.

Staging: https://ccp-bench-staging.web.app. The exported pilot contains 187 JSON files, approximately 0.77 MB, with three real models and 181 draft public items. Raw provider payloads stay private. Data versions are content-addressed and the current pointer is replaced atomically. Leak checks inspect raw and decoded JSON strings, held-out IDs, full hidden prompts, and canary tokens.

Verification performed locally:

- Workspace TypeScript, lint, and unit tests passed. Review-import tests use isolated in-memory fixtures; real review cases remain pending.
- Four Firestore emulator tests passed for anonymous valid submissions, malicious/oversized submissions, public run visibility, and admin resolution without complaint rewriting.
- Lighthouse production preview: leaderboard mobile 99 performance / 100 accessibility, desktop 100 / 100; item mobile 94 / 100 and desktop 100 / 100. Reports are retained privately under `.cache/lighthouse-*.json`.
- Firebase Hosting, Firestore rules/indexes, and deny-all Storage rules deployed successfully. The pilot archive uploaded to a bucket with uniform access and enforced public access prevention. No public IAM members are present.
- CI now includes a mock run/judge/score/publication dry run and emulator rules validation. Staging deployment waits for successful main CI and uses an OIDC trust restricted to this repository's deployment workflow on main.

Remaining release work: actual GitHub OAuth credentials and admin enrollment, translations and held-out evaluation, model metadata/host verification, full roster run, production setup and release. Human commentary will be integrated when supplied. These limitations are not represented as completed checks.
