import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { ModelRegistrySchema, PricesSchema } from '@ccp-bench/schema';
import { readYaml, root } from '../src/io';

const registry = await readYaml(
  join(root, 'configs/models.yaml'),
  ModelRegistrySchema,
);
const prices = await readYaml(join(root, 'configs/prices.yaml'), PricesSchema);
for (const key of ['mock-judge-a', 'mock-judge-b', 'mock-judge-c']) {
  if (!registry.some((m) => m.key === key))
    registry.push({
      key,
      display: key,
      vendor: 'Fixture',
      origin: 'us',
      weights: 'open',
      family: key,
      weights_id: key,
      host: 'local',
      endpoint: { provider: 'mock', model: key },
      release_date: '2026-09-07',
      notes: 'Synthetic CI judge fixture, never a real calibration result.',
    });
  prices[key] = {
    input_per_million: 0,
    output_per_million: 0,
    source: 'Local fixture',
    checked_at: '2026-09-07T00:00:00Z',
  };
}
await writeFile(join(root, 'configs/models.yaml'), stringify(registry));
await writeFile(join(root, 'configs/prices.yaml'), stringify(prices));
