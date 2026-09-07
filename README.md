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
