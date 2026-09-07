import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { stringify } from 'yaml';
import { ModelRegistrySchema, PricesSchema } from '@ccp-bench/schema';
import { root } from '../src/io';

// Manual catalog import, no inference requests and no secrets.
const source = 'https://openrouter.ai/api/v1/models';
const response = await fetch(source);
if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
const catalog = z
  .object({
    data: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        created: z.number(),
        pricing: z.object({ prompt: z.string(), completion: z.string() }),
      }),
    ),
  })
  .parse(await response.json()).data;
const roster: [
  string,
  string,
  'prc' | 'us' | 'eu',
  'open' | 'closed',
  string,
][] = [
  ['deepseek/deepseek-v3.2', 'DeepSeek', 'prc', 'open', 'deepseek'],
  ['deepseek/deepseek-v4-pro-0813', 'DeepSeek', 'prc', 'open', 'deepseek'],
  ['deepseek/deepseek-r1-0528', 'DeepSeek', 'prc', 'open', 'deepseek'],
  ['qwen/qwen3-235b-a22b-2507', 'Alibaba', 'prc', 'open', 'qwen'],
  ['qwen/qwen3-235b-a22b-thinking-2507', 'Alibaba', 'prc', 'open', 'qwen'],
  ['moonshotai/kimi-k2.5', 'Moonshot', 'prc', 'open', 'kimi'],
  ['moonshotai/kimi-k2-thinking', 'Moonshot', 'prc', 'open', 'kimi'],
  ['z-ai/glm-5', 'Z.ai', 'prc', 'open', 'glm'],
  ['minimax/minimax-m2.5', 'MiniMax', 'prc', 'open', 'minimax'],
  ['baidu/ernie-4.5-vl-424b-a47b', 'Baidu', 'prc', 'open', 'ernie'],
  ['openai/gpt-6-astra', 'OpenAI', 'us', 'closed', 'openai'],
  ['anthropic/claude-fable-5.1', 'Anthropic', 'us', 'closed', 'anthropic'],
  ['anthropic/claude-sonnet-5', 'Anthropic', 'us', 'closed', 'anthropic'],
  ['google/gemma-4-31b-it:free', 'Google', 'us', 'open', 'google'],
  ['google/gemini-3.8-flash', 'Google', 'us', 'closed', 'google'],
  ['google/gemini-3.1-pro-preview', 'Google', 'us', 'closed', 'google'],
  ['openai/gpt-oss-120b', 'OpenAI', 'us', 'open', 'openai'],
  ['meta-llama/llama-4-maverick', 'Meta', 'us', 'open', 'llama'],
  ['mistralai/mistral-large-2512', 'Mistral', 'eu', 'open', 'mistral'],
  ['x-ai/grok-4.6', 'xAI', 'us', 'closed', 'grok'],
];
const models = ModelRegistrySchema.parse(
  roster.map(([id, vendor, origin, weights, family]) => {
    const entry = catalog.find((m) => m.id === id);
    if (!entry) throw new Error(`Missing live model ${id}`);
    return {
      key: `${id.split('/')[1]!.replace(/[^a-z0-9-]/g, '-')}-openrouter`,
      display: `${entry.name} (OpenRouter)`,
      vendor,
      origin,
      weights,
      family,
      weights_id: id,
      host: 'third_party',
      endpoint: { provider: 'openrouter', model: id },
      release_date: new Date(entry.created * 1000).toISOString().slice(0, 10),
      notes:
        'Catalog snapshot 2026-09-07. release_date currently records catalog availability, pending vendor-release verification. OpenRouter may route to different underlying hosts; pin a provider before a controlled host-gap study.',
      recommended: {
        max_tokens: 8192,
        reasoning: 'default',
        ...(id.includes('qwen3-235b-a22b-2507')
          ? { temperature: 0.7, top_p: 0.8 }
          : id.includes('kimi-k2.5')
            ? { temperature: 1 }
            : id.includes('deepseek-v3.2')
              ? { temperature: 1 }
              : {}),
      },
      settings_source: id.includes('qwen3-235b-a22b-2507')
        ? 'https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507'
        : id.includes('kimi-k2.5')
          ? 'https://platform.kimi.ai/docs/guide/benchmark-best-practice'
          : id.includes('deepseek-v3.2')
            ? 'https://api-docs.deepseek.com/quick_start/parameter_settings/'
            : 'Provider defaults for unspecified sampling fields; developer recommendations require verification before the full release run.',
    };
  }),
);
for (const kind of ['engaged', 'narrative', 'judge-a', 'judge-b', 'judge-c'])
  models.push({
    key: `mock-${kind}`,
    display: `Mock ${kind} fixture`,
    vendor: 'Fixture',
    origin: kind === 'narrative' ? 'prc' : 'us',
    weights: 'open',
    family: `mock-${kind}`,
    weights_id: `mock-${kind}`,
    host: 'local',
    endpoint: { provider: 'mock', model: `mock-${kind}` },
    release_date: '2026-09-07',
    notes: 'Synthetic software fixture, never a benchmark result.',
  });
const prices = PricesSchema.parse(
  Object.fromEntries(
    models.map((model) => {
      const entry = catalog.find((m) => m.id === model.endpoint.model);
      return [
        model.key,
        {
          input_per_million: entry ? Number(entry.pricing.prompt) * 1e6 : 0,
          output_per_million: entry
            ? Number(entry.pricing.completion) * 1e6
            : 0,
          source: entry ? source : 'Local mock fixture',
          checked_at: new Date().toISOString(),
        },
      ];
    }),
  ),
);
await writeFile(join(root, 'configs/models.yaml'), stringify(models));
await writeFile(join(root, 'configs/prices.yaml'), stringify(prices));
console.log(
  `Wrote ${models.length} registry entries and their live catalog price snapshot`,
);
