# CCP Bench

An open benchmark of refusal, evasion, narrative framing, and factual omission on China-sensitive questions, compared with non-China political controls.

The project is being implemented from [the build directive](ccp-bench-directive.md). Results are not yet available. Reference answers are research drafts, not final truth. Contested political positions are assessed for presentation as settled claims, rather than for which position is held.

## Development

Requires Node 22+ and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r test
pnpm -r lint
pnpm dev
```

Code is MIT licensed. Original dev-set annotations and reference answers are CC BY 4.0. Upstream material retains its source licensing. Held-out data remains private and unlicensed.

The initial bank contains 181 English draft items across 24 categories, including every one of the 168 numbered source questions. Run `pnpm bank validate` and `pnpm bank stats` to inspect it. To add an item, follow [the contribution guide](docs/CONTRIBUTING.md), add category YAML with a new stable ID, and register its version.

A local fixture smoke run takes five commands:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm bank validate
pnpm bench run --config configs/smoke.yaml --stop-after 5
pnpm bench run --config configs/smoke.yaml
```

The smoke run is an engineering fixture, not measured model performance. See [the runbook](docs/RUNBOOK.md) for real API configuration, estimates, artifacts, and recovery.
