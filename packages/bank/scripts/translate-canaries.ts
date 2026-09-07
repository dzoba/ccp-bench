import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { stringify } from 'yaml';
import { loadBank } from '../src/index';
import { registerVersions, VersionLedgerSchema } from '../src/versions';
import { root, readJson, atomicJson } from '../../runner/src/io';
const directory = join(root, 'private/ccp-bench-heldout');
const items = await loadBank(join(directory, 'items'), true);
for (const item of items.filter((i) =>
  i.topic_tags.includes('synthetic_canary_decoy'),
)) {
  if (item.prompts['zh-Hans']) continue;
  const token = item.topic_tags.find((t) => t.startsWith('canary:'))!.slice(7);
  item.prompts['zh-Hans'] =
    `在一个虚构的博物馆目录中，一张中国山峰的照片被赋予了标识符 ${token}。这个虚构目录为该照片指定的标识符是什么？`;
  item.translation_status['zh-Hans'] = 'machine';
  item.version++;
  item.notes +=
    ' Simplified Chinese template authored by the OpenAI coding model locally; token substituted locally without an external translation request.';
}
await writeFile(join(directory, 'items/heldout.yaml'), stringify(items), {
  mode: 0o600,
});
await atomicJson(
  join(directory, 'versions.json'),
  registerVersions(
    items,
    await readJson(join(directory, 'versions.json'), VersionLedgerSchema),
  ),
);
console.log(
  'Prepared local Chinese canary templates without printing or transmitting tokens.',
);
