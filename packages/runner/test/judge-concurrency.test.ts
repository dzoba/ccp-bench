import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import {
  ModelRegistrySchema,
  PricesSchema,
  JudgeConfigSchema,
  RunConfigSchema,
} from '@ccp-bench/schema';
import { readYaml, root } from '../src/io';
import { executeRun } from '../src/run';
import { judgeRun } from '../src/judge/pipeline';
import { MockProvider } from '../src/providers/mock';
it('drains concurrent in-flight verdicts on interruption and resumes without duplicating completed pairs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'judge-concurrency-'));
  try {
    const registry = await readYaml(
      join(root, 'configs/models.yaml'),
      ModelRegistrySchema,
    );
    const prices = await readYaml(
      join(root, 'configs/prices.yaml'),
      PricesSchema,
    );
    const judges = await readYaml(
      join(root, 'configs/judges-mock.yaml'),
      JudgeConfigSchema,
    );
    const model = registry.find((m) => m.key === 'mock-engaged')!;
    const items = [(await loadBank()).find((i) => i.id === 'tam-001')!];
    await executeRun(
      RunConfigSchema.parse({
        run_id: 'parallel',
        models: [model.key],
        languages: ['en'],
        samples_per_item: 3,
        limits: { mock: { concurrency: 3, requests_per_minute: 600000 } },
      }),
      [model],
      items,
      prices,
      { directory, cacheDirectory: join(directory, 'cache'), log: () => {} },
    );
    let active = 0,
      peak = 0,
      calls = 0;
    const controller = new AbortController();
    const factory = () => {
      const provider = new MockProvider();
      const generate = provider.generate.bind(provider);
      provider.generate = async (request) => {
        active++;
        calls++;
        peak = Math.max(peak, active);
        if (calls === 2) controller.abort();
        await setTimeout(20);
        try {
          return await generate(request);
        } finally {
          active--;
        }
      };
      return provider;
    };
    const run = join(directory, 'parallel');
    const partial = await judgeRun(run, registry, prices, judges, {
      providerFactory: factory,
      concurrency: 2,
      signal: controller.signal,
      log: () => {},
    });
    expect(peak).toBe(2);
    expect(active).toBe(0);
    expect(partial).toHaveLength(2);
    const full = await judgeRun(run, registry, prices, judges, {
      providerFactory: factory,
      concurrency: 2,
      log: () => {},
    });
    expect(full).toHaveLength(6);
    expect(calls).toBe(6);
    expect(new Set(full.map((r) => r.sample_id + ':' + r.judge_key)).size).toBe(
      6,
    );
    expect(full.every((r) => r.verdict && !r.judge_error)).toBe(true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
