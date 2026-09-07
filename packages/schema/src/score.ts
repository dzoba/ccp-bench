import { z } from 'zod';
export const MetricEstimateSchema = z.strictObject({
  mean: z.number().nullable(),
  se: z.number().nonnegative().nullable(),
  n: z.number().int().nonnegative(),
});
export const MetricEstimatesSchema = z.strictObject({
  refusal_rate: MetricEstimateSchema,
  evasion: MetricEstimateSchema,
  nas: MetricEstimateSchema,
  omission_rate: MetricEstimateSchema,
  euphemism_rate: MetricEstimateSchema,
  contested_as_settled_rate: MetricEstimateSchema,
});
export const ScoreGroupSchema = z.strictObject({
  model_key: z.string(),
  language: z.string(),
  split: z.string(),
  scope: z.enum([
    'china_sensitive',
    'non_china_control',
    'china_neutral_control',
  ]),
  category: z.string(),
  type: z.string(),
  metrics: MetricEstimatesSchema,
});
export const ScoredItemSchema = z.strictObject({
  model_key: z.string(),
  language: z.string(),
  split: z.enum(['dev', 'heldout']),
  item_id: z.string(),
  category: z.string(),
  type: z.string(),
  scope: z.enum([
    'china_sensitive',
    'non_china_control',
    'china_neutral_control',
  ]),
  metrics: z.strictObject({
    refusal_rate: z.number().nullable(),
    evasion: z.number().nullable(),
    nas: z.number().nullable(),
    omission_rate: z.number().nullable(),
    euphemism_rate: z.number().nullable(),
    contested_as_settled_rate: z.number().nullable(),
  }),
});
export const ExclusionsSchema = z.strictObject({
  provider_error: z.number().int().nonnegative(),
  api_filter: z.number().int().nonnegative(),
  truncated: z.number().int().nonnegative(),
  missing_judges: z.number().int().nonnegative(),
});
export const ScoresSchema = z.strictObject({
  run_id: z.string(),
  bench_version: z.string(),
  groups: z.array(ScoreGroupSchema),
  items: z.array(ScoredItemSchema),
  leaderboard: z.array(
    z.strictObject({
      model_key: z.string(),
      composite: MetricEstimateSchema,
      metrics: MetricEstimatesSchema,
    }),
  ),
  china_specificity: z.array(
    z.strictObject({
      model_key: z.string(),
      language: z.string(),
      split: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
  language_gaps: z.array(
    z.strictObject({
      model_key: z.string(),
      split: z.string(),
      language: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
  host_gaps: z.array(
    z.strictObject({
      vendor_model: z.string(),
      other_model: z.string(),
      language: z.string(),
      split: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
  exclusions: ExclusionsSchema,
  coverage: z.array(
    z.strictObject({
      model_key: z.string(),
      language: z.string(),
      recorded_samples: z.number().int().nonnegative(),
      scored_samples: z.number().int().nonnegative(),
      exclusions: ExclusionsSchema,
    }),
  ),
});
export type Scores = z.infer<typeof ScoresSchema>;
