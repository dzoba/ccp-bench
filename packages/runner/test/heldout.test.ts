import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { stringify } from 'yaml';
import { loadBank, loadEvaluationBank } from '@ccp-bench/bank';
import {
  ModelRegistrySchema,
  PricesSchema,
  JudgeConfigSchema,
  RunConfigSchema,
  ItemSchema,
} from '@ccp-bench/schema';
import { readYaml, root } from '../src/io';
import { executeRun } from '../src/run';
import { judgeRun } from '../src/judge/pipeline';
import { scoreRun } from '../src/score/aggregate';
import { exportStatic, assertNoHeldoutLeak } from '../src/publish/static';
it('includes held-out observations in aggregates and strips every hidden item artifact on export', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'ccp-private-test-'));
  try {
    const original = (await loadBank()).find((i) => i.id === 'tam-001')!;
    const hidden = ItemSchema.parse({
      ...original,
      id: 'h-tam-901',
      split: 'heldout',
      prompts: {
        en: 'Unpublished fixture question with the token TESTCANARY1234567.',
      },
      translation_status: {},
      topic_tags: ['canary:TESTCANARY1234567'],
      narrative_flags: original.narrative_flags.map((f) => ({
        ...f,
        id: f.id.replace('tam-001', 'h-tam-901'),
      })),
      required_facts: original.required_facts.map((f) => ({
        ...f,
        id: f.id.replace('tam-001', 'h-tam-901'),
      })),
    });
    await mkdir(join(temporary, 'items'));
    await writeFile(join(temporary, 'items/private.yaml'), stringify([hidden]));
    vi.stubEnv('HELDOUT_REPO_PATH', temporary);
    expect((await loadEvaluationBank()).some((i) => i.id === hidden.id)).toBe(
      true,
    );
    expect((await loadBank()).some((i) => i.id === hidden.id)).toBe(false);
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
    const config = RunConfigSchema.parse({
      run_id: 'heldout-fixture',
      models: [model.key],
      languages: ['en'],
      samples_per_item: 1,
      limits: { mock: { concurrency: 2, requests_per_minute: 600000 } },
      max_cost_usd: 0,
    });
    await executeRun(config, [model], [original, hidden], prices, {
      directory: temporary,
      cacheDirectory: join(temporary, 'cache'),
      log: () => {},
    });
    const run = join(temporary, 'heldout-fixture');
    await judgeRun(run, registry, prices, judges, { log: () => {} });
    const scores = await scoreRun(run, { nas: 1, refusal: 25, omission: 10 });
    expect(scores.items.some((i) => i.item_id === hidden.id)).toBe(true);
    expect(scores.leaderboard[0]!.metrics.nas.n).toBe(2);
    const destination = join(temporary, 'public');
    const exported = await exportStatic('heldout-fixture', {
      provisional: true,
      runDirectory: temporary,
      destination,
    });
    const files: Record<string, string> = {};
    async function readTree(directory: string, prefix = '') {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const name = prefix + entry.name;
        if (entry.isDirectory())
          await readTree(join(directory, entry.name), name + '/');
        else files[name] = await readFile(join(directory, entry.name), 'utf8');
      }
    }
    await readTree(join(destination, exported.version));
    expect(() => assertNoHeldoutLeak(files, [hidden])).not.toThrow();
    expect(Object.keys(files).some((name) => name.includes(hidden.id))).toBe(
      false,
    );
    const modelData = JSON.parse(files['models/mock-engaged.json']!);
    expect(modelData.items).toHaveLength(1);
    expect(modelData.metrics.nas.n).toBe(2);
    expect(JSON.stringify(files)).not.toContain('TESTCANARY1234567');
  } finally {
    vi.unstubAllEnvs();
    await rm(temporary, { recursive: true, force: true });
  }
});
