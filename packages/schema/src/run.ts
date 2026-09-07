import { z } from 'zod';
import { ItemSchema, LanguageSchema } from './item';

export const ProviderIdSchema = z.enum([
  'openrouter',
  'deepseek',
  'moonshot',
  'zhipu',
  'minimax',
  'openai',
  'anthropic',
  'google',
  'vllm',
  'together',
  'fireworks',
  'qwen',
  'mistral',
  'xai',
  'ernie',
  'doubao',
  'mock',
]);
export const SamplingOptionsSchema = z.strictObject({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().gt(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  reasoning: z.enum(['default', 'off', 'max']).optional(),
});
export const SamplingSchema = SamplingOptionsSchema.extend({
  max_tokens: z.number().int().positive().default(4096),
  reasoning: z.enum(['default', 'off', 'max']).default('default'),
});
export const ModelSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  display: z.string().min(1),
  vendor: z.string().min(1),
  origin: z.enum(['prc', 'us', 'eu', 'other']),
  weights: z.enum(['open', 'closed']),
  family: z.string().min(1),
  weights_id: z.string().min(1),
  host: z.enum(['vendor', 'third_party', 'local']),
  endpoint: z.strictObject({
    provider: ProviderIdSchema,
    model: z.string().min(1),
    base_url: z.url().optional(),
    key_env: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]*$/)
      .optional(),
  }),
  release_date: z.iso.date(),
  notes: z.string().default(''),
  recommended: SamplingSchema.optional(),
  settings_source: z.string().optional(),
});
export const ModelRegistrySchema = z
  .array(ModelSchema)
  .min(1)
  .superRefine((models, ctx) => {
    if (new Set(models.map((m) => m.key)).size !== models.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate model key' });
  });
export const MessageSchema = z.strictObject({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export const GenerateRequestSchema = z.strictObject({
  model: z.string().min(1),
  messages: z.array(MessageSchema).min(1),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().int().positive(),
  reasoning: z.enum(['default', 'off', 'max']),
  response_format: z.record(z.string(), z.unknown()).optional(),
  metadata: z.strictObject({
    item_id: z.string(),
    lang: LanguageSchema,
    sample_idx: z.number().int().nonnegative(),
  }),
});
export const GenerateResponseSchema = z.strictObject({
  text: z.string(),
  reasoning: z.string().optional(),
  finish_reason: z.string(),
  usage: z.strictObject({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
    reasoning: z.number().nonnegative().optional(),
  }),
  latency_ms: z.number().nonnegative(),
  raw: z.unknown().optional(),
  provider_error: z.string().optional(),
  filter_layer: z.enum(['api', 'none', 'unknown']),
  provider_cost: z.number().nonnegative().optional(),
});
export const ProviderLimitSchema = z.strictObject({
  concurrency: z.number().int().min(1).max(100).default(3),
  requests_per_minute: z.number().positive().default(60),
});
export const RunConfigSchema = z
  .strictObject({
    run_id: z
      .string()
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
      .optional(),
    bench_version: z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]*$/)
      .default('0.1.0-dev'),
    models: z.array(z.string()).min(1),
    item_ids: z.array(z.string()).min(1).optional(),
    languages: z
      .array(LanguageSchema)
      .min(1)
      .default(['en', 'zh-Hans', 'zh-Hant']),
    samples_per_item: z.number().int().min(1).max(20).default(3),
    system_prompt: z
      .union([z.literal(''), z.literal('You are a helpful assistant.')])
      .default(''),
    sampling: SamplingOptionsSchema.default({}),
    limits: z.record(z.string(), ProviderLimitSchema).default({}),
    retries: z.number().int().min(0).max(5).default(3),
    retry_base_ms: z.number().int().min(1).default(1000),
    timeout_ms: z.number().int().min(100).default(180000),
    max_cost_usd: z.number().nonnegative().optional(),
  })
  .superRefine((config, ctx) => {
    for (const field of ['models', 'languages', 'item_ids'] as const) {
      const values = config[field];
      if (values && new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${field}` });
    }
  });
export const PriceSchema = z.strictObject({
  input_per_million: z.number().nonnegative(),
  output_per_million: z.number().nonnegative(),
  source: z.string(),
  checked_at: z.iso.datetime(),
});
export const PricesSchema = z.record(z.string(), PriceSchema);
export const ResponseRecordSchema = z.strictObject({
  sample_id: z.string(),
  item_id: z.string(),
  item_version: z.number().int().positive(),
  split: z.enum(['dev', 'heldout']),
  model_key: z.string(),
  lang: LanguageSchema,
  sample_idx: z.number().int().nonnegative(),
  request_hash: z.string(),
  response: GenerateResponseSchema,
  cached: z.boolean(),
  cost_usd: z.number().nonnegative(),
  generation_cost_usd: z.number().nonnegative(),
  attempts: z.number().int().nonnegative(),
  billing_uncertain: z.boolean().optional(),
  created_at: z.iso.datetime(),
});
export const RunTotalsSchema = z.strictObject({
  planned: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  filtered: z.number().int().nonnegative(),
  truncated: z.number().int().nonnegative(),
  cached: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
  input_tokens: z.number().nonnegative(),
  output_tokens: z.number().nonnegative(),
  billing_uncertain_samples: z.number().int().nonnegative().optional(),
});
export const ManifestSchema = z.strictObject({
  run_id: z.string(),
  bench_version: z.string(),
  identity_hash: z.string(),
  git_sha: z.string(),
  git_dirty: z.boolean().optional(),
  started_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  status: z.enum(['running', 'interrupted', 'complete']),
  config: RunConfigSchema,
  models: ModelRegistrySchema,
  items: z.array(ItemSchema),
  prices: PricesSchema,
  totals: RunTotalsSchema,
});
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
export type RunConfig = z.infer<typeof RunConfigSchema>;
export type ResponseRecord = z.infer<typeof ResponseRecordSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type Prices = z.infer<typeof PricesSchema>;
