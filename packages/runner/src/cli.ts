import { Command } from 'commander';
import { readFile, rm } from 'node:fs/promises';
import { hostname } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import {
  ModelRegistrySchema,
  PricesSchema,
  RunConfigSchema,
} from '@ccp-bench/schema';
import { loadEvaluationBank } from '@ccp-bench/bank';
import { readYaml, root } from './io';
import { verifyModels } from './providers';
import { estimateRun } from './estimate';
import { executeRun } from './run';
import { generateSchemaDocs } from './schema-docs';
import { JudgeConfigSchema, ScoringWeightsSchema } from '@ccp-bench/schema';
import { judgeRun } from './judge/pipeline';
import { scoreRun } from './score/aggregate';
import { reviewRun } from './judge/review';
import { calibrateJudges } from './judge/calibration';
import { reviewCalibration } from './judge/review-calibration';
import { importReview } from './judge/import-review';
import { discover } from './discover/pipeline';
import { indexPublishedRun } from './publish/index';
import { publishRun } from './publish/cloud';
import { exportStatic } from './publish/static';

const resolve = (path: string) => (isAbsolute(path) ? path : join(root, path));
const program = new Command()
  .name('bench')
  .description('Reproducible batch benchmark tools');
program
  .command('discover')
  .requiredOption('--topics <path>')
  .requiredOption('--pilot-models <keys>', 'Four comma-separated model keys')
  .option('--n <count>', 'Maximum generated candidates', '200')
  .option(
    '--generator <key>',
    'Non-PRC question generator',
    'claude-sonnet-5-openrouter',
  )
  .option('--judge <key>', 'Divergence judge', 'mistral-large-2512-openrouter')
  .option(
    '--embedding-model <id>',
    'Embedding model',
    'openai/text-embedding-3-small',
  )
  .option('--max-cost <usd>', 'Total budget', '10')
  .option('--output <path>')
  .option('--dry-run')
  .action(async (raw: unknown) => {
    const o = z
      .object({
        topics: z.string(),
        pilotModels: z.string(),
        n: z.coerce.number().int().positive().max(10000),
        generator: z.string(),
        judge: z.string(),
        embeddingModel: z.string(),
        maxCost: z.coerce.number().positive(),
        output: z.string().optional(),
        dryRun: z.boolean().default(false),
      })
      .parse(raw);
    console.log(
      JSON.stringify(
        await discover({
          ...o,
          topics: resolve(o.topics),
          pilotModels: o.pilotModels.split(',').map((k) => k.trim()),
          output: o.output ? resolve(o.output) : undefined,
        }),
        null,
        2,
      ),
    );
  });
program.command('schemas').action(generateSchemaDocs);
program
  .command('index-published')
  .requiredOption('--target <target>')
  .action(async (raw: unknown) => {
    const { target } = z
      .object({ target: z.enum(['staging', 'prod']) })
      .parse(raw);
    console.log(JSON.stringify(await indexPublishedRun(target), null, 2));
  });
program
  .command('publish')
  .requiredOption('--run <id>')
  .requiredOption('--target <target>')
  .option('--set <id>', 'Grading revision', 'default')
  .option('--provisional')
  .option('--calibration <path>')
  .option('--dry-run')
  .action(async (raw: unknown) => {
    const o = z
      .object({
        run: z.string(),
        target: z.enum(['staging', 'prod']),
        set: z.string(),
        provisional: z.boolean().default(false),
        calibration: z.string().optional(),
        dryRun: z.boolean().default(false),
      })
      .parse(raw);
    console.log(
      JSON.stringify(
        await publishRun(o.run, {
          ...o,
          judgeSet: o.set,
          calibration: o.calibration ? resolve(o.calibration) : undefined,
        }),
        null,
        2,
      ),
    );
  });
program
  .command('export')
  .requiredOption('--run <id>')
  .option('--set <id>', 'Grading revision', 'default')
  .option('--provisional', 'Explicitly label unvalidated results')
  .option('--calibration <path>')
  .option('--dry-run')
  .action(async (raw: unknown) => {
    const o = z
      .object({
        run: z.string(),
        set: z.string(),
        provisional: z.boolean().default(false),
        calibration: z.string().optional(),
        dryRun: z.boolean().default(false),
      })
      .parse(raw);
    console.log(
      JSON.stringify(
        await exportStatic(o.run, {
          judgeSet: o.set,
          provisional: o.provisional,
          calibration: o.calibration ? resolve(o.calibration) : undefined,
          dryRun: o.dryRun,
        }),
        null,
        2,
      ),
    );
  });
program
  .command('import-review')
  .requiredOption('--file <path>')
  .option('--dry-run')
  .action(async (raw: unknown) => {
    const o = z
      .object({ file: z.string(), dryRun: z.boolean().default(false) })
      .parse(raw);
    console.log(
      JSON.stringify(await importReview(resolve(o.file), o.dryRun), null, 2),
    );
  });
program
  .command('review-calibration')
  .requiredOption('--reviewer <name>', 'Human reviewer identity')
  .action(async (raw: unknown) => {
    const { reviewer } = z.object({ reviewer: z.string().min(1) }).parse(raw);
    await reviewCalibration(reviewer);
  });
program
  .command('calibrate')
  .option('--judges <path>', 'Judge config', 'configs/judges.yaml')
  .option(
    '--output <path>',
    'Private calibration report',
    'runs/calibration/report.json',
  )
  .action(async (raw: unknown) => {
    const { judges, output } = z
      .object({ judges: z.string(), output: z.string() })
      .parse(raw);
    const report = await calibrateJudges(
      await readYaml(join(root, 'configs/models.yaml'), ModelRegistrySchema),
      await readYaml(join(root, 'configs/prices.yaml'), PricesSchema),
      await readYaml(resolve(judges), JudgeConfigSchema),
      resolve(output),
    );
    console.log(
      JSON.stringify(
        {
          passed: report.passed,
          human_validated: report.human_validated,
          judges: report.judges,
          cost_usd: report.cost_usd,
        },
        null,
        2,
      ),
    );
  });
program
  .command('judge')
  .requiredOption('--run <id>', 'Existing run ID')
  .option('--concurrency <count>', 'Concurrent judge requests', '1')
  .option(
    '--budget-limited',
    'Permit a partial workload under a persistent per-request spending cap',
  )
  .option('--set <id>', 'Separate grading revision', 'default')
  .option('--judges <path>', 'Judge configuration', 'configs/judges.yaml')
  .action(async (raw: unknown) => {
    const options = z
      .object({
        run: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
        judges: z.string(),
        set: z.string(),
        concurrency: z.coerce.number().int().min(1).max(32),
        budgetLimited: z.boolean().default(false),
      })
      .parse(raw);
    const registry = await readYaml(
      join(root, 'configs/models.yaml'),
      ModelRegistrySchema,
    );
    const prices = await readYaml(
      join(root, 'configs/prices.yaml'),
      PricesSchema,
    );
    const config = await readYaml(resolve(options.judges), JudgeConfigSchema);
    const controller = new AbortController();
    const stop = () => {
      console.log('Finishing in-flight judge requests before stopping.');
      controller.abort();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      const records = await judgeRun(
        join(root, 'runs', options.run),
        registry,
        prices,
        config,
        {
          judgeSet: options.set,
          concurrency: options.concurrency,
          budgetLimited: options.budgetLimited,
          signal: controller.signal,
        },
      );
      console.log(
        `Recorded ${records.length} verdicts, ${records.filter((r) => r.judge_error).length} errors`,
      );
    } finally {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
    }
  });
program
  .command('score')
  .requiredOption('--run <id>', 'Existing run ID')
  .option('--set <id>', 'Grading revision', 'default')
  .action(async (raw: unknown) => {
    const { run, set } = z
      .object({
        run: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
        set: z.string(),
      })
      .parse(raw);
    const result = await scoreRun(
      join(root, 'runs', run),
      await readYaml(join(root, 'configs/scoring.yaml'), ScoringWeightsSchema),
      set,
    );
    console.log(
      `Scored ${result.items.length} model-language-item observations; exclusions ${JSON.stringify(result.exclusions)}`,
    );
  });
program
  .command('review')
  .requiredOption('--run <id>', 'Existing run ID')
  .option('--set <id>', 'Grading revision', 'default')
  .requiredOption('--reviewer <name>', 'Human reviewer identity')
  .action(async (raw: unknown) => {
    const { run, reviewer, set } = z
      .object({
        run: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
        reviewer: z.string().min(1),
        set: z.string(),
      })
      .parse(raw);
    await reviewRun(join(root, 'runs', run), reviewer, set);
  });
const configOption = (command: Command) =>
  command
    .requiredOption('--config <path>', 'Run configuration YAML')
    .option('--registry <path>', 'Model registry', 'configs/models.yaml')
    .option('--prices <path>', 'Token prices', 'configs/prices.yaml');
async function inputs(raw: unknown) {
  const options = z
    .object({ config: z.string(), registry: z.string(), prices: z.string() })
    .parse(raw);
  const config = await readYaml(resolve(options.config), RunConfigSchema);
  const registry = await readYaml(
    resolve(options.registry),
    ModelRegistrySchema,
  );
  const models = config.models.map((key) => {
    const model = registry.find((m) => m.key === key);
    if (!model) throw new Error(`Unknown model key ${key}`);
    return model;
  });
  const bank = (await loadEvaluationBank()).filter(
    (item) => item.review_status !== 'retired',
  );
  const items = config.item_ids
    ? config.item_ids.map((id) => {
        const item = bank.find((i) => i.id === id);
        if (!item) throw new Error(`Unknown or retired item ${id}`);
        return item;
      })
    : bank;
  if (!items.some((i) => config.languages.some((lang) => i.prompts[lang])))
    throw new Error('No prompts available for selected languages');
  const prices = await readYaml(resolve(options.prices), PricesSchema);
  return { config, models, items, prices };
}
configOption(program.command('run'))
  .option(
    '--concurrency <count>',
    'Operational concurrency override; sampling remains unchanged',
  )
  .option(
    '--budget-limited',
    'Permit a partial workload under a persistent per-request spending cap',
  )
  .option('--no-cache', 'Bypass response cache reads and writes')
  .option(
    '--stop-after <count>',
    'Stop after this many new samples to exercise resumption',
    (s) => z.coerce.number().int().positive().parse(s),
  )
  .action(async (raw: unknown) => {
    const options = z
      .object({
        cache: z.boolean().default(true),
        concurrency: z.coerce.number().int().min(1).max(100).optional(),
        budgetLimited: z.boolean().default(false),
        stopAfter: z.number().optional(),
      })
      .parse(raw);
    const { config, models, items, prices } = await inputs(raw);
    const controller = new AbortController();
    const stop = () => {
      console.log('Finishing in-flight requests before stopping.');
      controller.abort();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    try {
      const manifest = await executeRun(config, models, items, prices, {
        noCache: !options.cache,
        concurrency: options.concurrency,
        budgetLimited: options.budgetLimited,
        stopAfter: options.stopAfter,
        signal: controller.signal,
      });
      if (manifest.totals.failed) process.exitCode = 1;
    } finally {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
    }
  });
configOption(program.command('estimate')).action(async (raw: unknown) => {
  const { config, models, items, prices } = await inputs(raw);
  console.log(
    JSON.stringify(estimateRun(config, models, items, prices), null, 2),
  );
});
configOption(program.command('models').command('verify')).action(
  async (raw: unknown) => {
    const { models } = await inputs(raw);
    await verifyModels(models);
    console.log(
      `Verified ${models.length} model IDs against live provider lists`,
    );
  },
);
program
  .command('unlock')
  .requiredOption('--run <id>', 'Run with a stale writer lock')
  .action(async (raw: unknown) => {
    const { run } = z
      .object({ run: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/) })
      .parse(raw);
    const path = join(root, 'runs', run, 'writer.lock');
    const record = z
      .object({ pid: z.number().int().positive(), hostname: z.string() })
      .parse(JSON.parse(await readFile(path, 'utf8')));
    if (record.hostname !== hostname())
      throw new Error(
        'Writer belongs to another host; verify its process there before removing the lock',
      );
    try {
      process.kill(record.pid, 0);
      throw new Error(
        `Writer PID ${record.pid} is still live; refusing to unlock`,
      );
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ESRCH'
      ))
        throw error;
    }
    await rm(path);
    console.log(`Removed stale lock for ${run}`);
  });
await program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
