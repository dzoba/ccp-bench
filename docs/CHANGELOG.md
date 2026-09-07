# Changelog

## Unreleased

- Scaffolded a strict TypeScript pnpm workspace with React 19 and Vite.
- Converted all 168 numbered source questions into 24 category YAML files, preserving source category, question, type, narrative, reference, and attribution notes.
- Added 13 indirect probes to cover categories that had no indirect or control-adjacent item. Each links to its source-derived item. No original items were moved between categories or removed.
- Assigned stable IDs, item-scoped narrative flags, weighted required facts, and explicit contested-claim flags. All annotations remain drafts pending factual and rubric review.
- Neutralized leading wording and anchored time-dependent prompts where feasible. Exact edits are listed in `docs/IMPORT_REPORT.md`.
- Added provider adapters, live model verification, retry and rate limits, independent-draw caching, durable resumable run artifacts, and cost accounting. The real 10-item engineering validation passed with DeepSeek V3.2 and GPT-OSS-120B.
- No benchmark scores or release results have been published.
