import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import {
  JudgeConfigSchema,
  ModelSchema,
  RunConfigSchema,
} from '@ccp-bench/schema';
import { executeRun } from '../src/run';
import { judgeRun } from '../src/judge/pipeline';
import { scoreRun } from '../src/score/aggregate';
import { MockProvider } from '../src/providers/mock';
import { ProviderError } from '../src/providers/types';
import { appendJsonl } from '../src/io';

describe('artifact-only judge and score pipeline', () => {
  it('grades both families, scores controls symmetrically, and applies a recorded review override without re-querying tested models', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ccp-pipeline-'));
    try {
      const keys = [
        'mock-engaged',
        'mock-narrative',
        'mock-judge-a',
        'mock-judge-b',
        'mock-judge-c',
      ];
      const registry = keys.map((key) =>
        ModelSchema.parse({
          key,
          display: key,
          vendor: 'Fixture',
          origin: key === 'mock-narrative' ? 'prc' : 'us',
          weights: 'open',
          family: key,
          weights_id: key,
          host: 'local',
          endpoint: { provider: 'mock', model: key },
          release_date: '2026-09-07',
        }),
      );
      const prices = Object.fromEntries(
        keys.map((key) => [
          key,
          {
            input_per_million: 0,
            output_per_million: 0,
            source: 'fixture',
            checked_at: '2026-09-07T00:00:00Z',
          },
        ]),
      );
      const items = (await loadBank()).filter((i) =>
        ['tam-001', 'ncc-001'].includes(i.id),
      );
      const config = RunConfigSchema.parse({
        run_id: 'pipeline',
        models: keys.slice(0, 2),
        languages: ['en'],
        samples_per_item: 3,
        limits: { mock: { concurrency: 3, requests_per_minute: 600000 } },
      });
      let testedCalls = 0;
      const factory = () => {
        const provider = new MockProvider();
        const generate = provider.generate.bind(provider);
        provider.generate = async (req) => {
          if (!req.model.startsWith('mock-judge-')) testedCalls++;
          return generate(req);
        };
        return provider;
      };
      await executeRun(config, registry.slice(0, 2), items, prices, {
        directory,
        cacheDirectory: join(directory, 'cache'),
        providerFactory: factory,
        log: () => {},
      });
      expect(testedCalls).toBe(12);
      const run = join(directory, 'pipeline');
      const judgeConfig = JudgeConfigSchema.parse({
        judges: keys.slice(2),
        requests_per_minute: 600000,
        max_cost_usd: 0,
      });
      const judgments = await judgeRun(run, registry, prices, judgeConfig, {
        providerFactory: factory,
        log: () => {},
      });
      expect(judgments).toHaveLength(24);
      expect(judgments.some((j) => j.judge_error)).toBe(false);
      const scores = await scoreRun(run, { nas: 1, refusal: 25, omission: 10 });
      const row = scores.items.find(
        (r) => r.item_id === 'tam-001' && r.model_key === 'mock-narrative',
      )!;
      expect(row.metrics.nas).toBe(40);
      expect(row.metrics.refusal_rate).toBeCloseTo(1 / 3);
      expect(row.metrics.omission_rate).toBe(1);
      expect(
        scores.items.find(
          (r) => r.item_id === 'ncc-001' && r.model_key === 'mock-narrative',
        )!.metrics.nas,
      ).toBe(0);
      const first = judgments.find(
        (r) => r.sample_id === 'mock-narrative:tam-001:en:0',
      )!;
      await appendJsonl(join(run, 'human-reviews.jsonl'), {
        sample_id: first.sample_id,
        verdict: {
          ...first.verdict,
          flags_matched: items
            .find((i) => i.id === 'tam-001')!
            .narrative_flags.map((f) => f.id),
        },
        reviewed_by: 'test fixture, not a human research review',
        reviewed_at: '2026-09-07T00:00:00Z',
      });
      const revised = await scoreRun(run, {
        nas: 1,
        refusal: 25,
        omission: 10,
      });
      expect(
        revised.items.find(
          (r) => r.item_id === 'tam-001' && r.model_key === 'mock-narrative',
        )!.metrics.nas,
      ).toBeCloseTo(160 / 3);
      expect(testedCalls).toBe(12);
      const separate = await judgeRun(run, registry, prices, judgeConfig, {
        providerFactory: factory,
        judgeSet: 'revision-2',
        log: () => {},
      });
      expect(separate).toHaveLength(24);
      const independent = await scoreRun(
        run,
        { nas: 1, refusal: 25, omission: 10 },
        'revision-2',
      );
      expect(
        independent.items.find(
          (r) => r.item_id === 'tam-001' && r.model_key === 'mock-narrative',
        )!.metrics.nas,
      ).toBe(40);
      expect(
        independent.coverage.every(
          (r) => r.scored_samples === 6 && r.recorded_samples === 6,
        ),
      ).toBe(true);
      expect(testedCalls).toBe(12);
      let blockedCalls = 0;
      await expect(
        judgeRun(run, registry, prices, judgeConfig, {
          judgeSet: 'credit-failure',
          providerFactory: () => {
            const provider = new MockProvider();
            provider.generate = async () => {
              blockedCalls++;
              throw new ProviderError('Insufficient credit', 402);
            };
            return provider;
          },
        }),
      ).rejects.toThrow('Judge stopped after Insufficient credit');
      expect(blockedCalls).toBe(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
