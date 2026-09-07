import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ItemSchema } from '@ccp-bench/schema';
import { suggestSplit } from './split';
import { bankStats, loadBank, validateBank } from './index';
import {
  VersionLedgerSchema,
  registerVersions,
  validateVersions,
} from './versions';

const ledgerPath = fileURLToPath(new URL('../versions.json', import.meta.url));

const program = new Command().name('bank');
program
  .command('split-suggest')
  .option('--ratio <ratio>', 'Target fraction', '0.3')
  .option('--seed <seed>', 'Stable selection seed', 'ccp-bench-v0.1')
  .action(async (raw: unknown) => {
    const o = z
      .object({ ratio: z.coerce.number().gt(0).lt(1), seed: z.string() })
      .parse(raw);
    console.log(
      JSON.stringify(suggestSplit(await loadBank(), o.ratio, o.seed), null, 2),
    );
  });
program
  .command('translate')
  .requiredOption('--lang <lang>')
  .option('--only-missing')
  .option('--model <key>', 'Non-PRC translator', 'claude-sonnet-5-openrouter')
  .option('--max-cost <usd>', 'Budget cap', '2')
  .option('--dry-run')
  .option('--directory <path>', 'Private bank items directory')
  .action(async (raw: unknown) => {
    const o = z
      .object({
        lang: z.enum(['zh-Hans', 'zh-Hant']),
        onlyMissing: z.boolean().default(false),
        model: z.string(),
        maxCost: z.coerce.number().positive(),
        dryRun: z.boolean().default(false),
        directory: z.string().optional(),
      })
      .parse(raw);
    const { translateBank } =
      await import('../../runner/src/authoring/translate');
    await translateBank(o);
  });
program.command('review-translations').action(async () => {
  const { reviewTranslations } = await import('./review-translations');
  await reviewTranslations();
});
program.command('validate').action(async () => {
  const items = await loadBank();
  validateBank(items, { requireAllCategories: true });
  validateVersions(
    items,
    VersionLedgerSchema.parse(JSON.parse(await readFile(ledgerPath, 'utf8'))),
  );
  console.log(
    `Validated ${items.length} items across ${Object.keys(bankStats(items).categories).length} categories`,
  );
  const missing = bankStats(items).categories_without_indirect_or_control;
  if (missing.length)
    console.log(
      `Coverage review needed (no indirect/control-adjacent item): ${missing.join(', ')}`,
    );
});
program.command('register-versions').action(async () => {
  let previous = {};
  try {
    previous = VersionLedgerSchema.parse(
      JSON.parse(await readFile(ledgerPath, 'utf8')),
    );
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  await writeFile(
    ledgerPath,
    JSON.stringify(registerVersions(await loadBank(), previous), null, 2) +
      '\n',
  );
  console.log(
    'Registered item versions without replacing historical fingerprints',
  );
});
program
  .command('stats')
  .action(async () =>
    console.log(JSON.stringify(bankStats(await loadBank()), null, 2)),
  );
program.command('schema').action(async () => {
  const schema = z.toJSONSchema(ItemSchema);
  const target = fileURLToPath(
    new URL('../../../docs/ITEM_SCHEMA.md', import.meta.url),
  );
  await writeFile(
    target,
    '# Item schema\n\nGenerated from `packages/schema/src/item.ts`. Do not edit the JSON manually.\n\nRuntime refinements also enforce held-out prefixes, item-scoped flag/fact IDs, relevant control actors, translation/status pairing, and explicit settled-claim flags on contested items.\n\n```json\n' +
      JSON.stringify(schema, null, 2) +
      '\n```\n',
  );
  console.log(target);
});
await program.parseAsync();
