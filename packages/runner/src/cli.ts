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
import { loadBank } from '@ccp-bench/bank';
import { readYaml, root } from './io';
import { verifyModels } from './providers';
import { estimateRun } from './estimate';
import { executeRun } from './run';
import { generateSchemaDocs } from './schema-docs';

const resolve = (path: string) => (isAbsolute(path) ? path : join(root, path));
const program = new Command()
  .name('bench')
  .description('Reproducible batch benchmark tools');
program.command('schemas').action(generateSchemaDocs);
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
  const bank = (await loadBank()).filter(
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
