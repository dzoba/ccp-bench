import { Command } from 'commander';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ItemSchema } from '@ccp-bench/schema';
import { bankStats, loadBank, validateBank } from './index';
import {
  VersionLedgerSchema,
  registerVersions,
  validateVersions,
} from './versions';

const ledgerPath = fileURLToPath(new URL('../versions.json', import.meta.url));

const program = new Command().name('bank');
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
