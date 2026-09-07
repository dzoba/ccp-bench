import { z } from 'zod';
import { ItemSchema } from './item';
import { ModelSchema } from './run';
import { JudgeVerdictSchema, ScoringWeightsSchema } from './judge';
import {
  MetricEstimateSchema,
  MetricEstimatesSchema,
  ScoreGroupSchema,
  ScoredItemSchema,
} from './score';
export const AgreementRowSchema = z.object({
  category: z.string(),
  judge_keys: z.array(z.string()),
  field: z.string(),
  kappa: z.number().nullable(),
  pairs: z.number().int().nonnegative(),
});
export const PublicTranscriptSchema = z.object({
  model_key: z.string(),
  language: z.string(),
  sample_idx: z.number().int(),
  text: z.string(),
  reasoning: z.string().optional(),
  finish_reason: z.string(),
  provider_error: z.string().optional(),
  filter_layer: z.string(),
  judgments: z.array(
    z.object({
      judge_key: z.string(),
      verdict: JudgeVerdictSchema.optional(),
      judge_error: z.string().optional(),
    }),
  ),
  human: z
    .object({ verdict: JudgeVerdictSchema, reviewed_at: z.string() })
    .optional(),
});
export const PublicItemSchema = z.object({
  item: ItemSchema,
  transcripts: z.array(PublicTranscriptSchema),
});
export const ItemSummarySchema = z.object({
  id: z.string(),
  category: z.string(),
  type: z.string(),
  contested: z.boolean(),
  prompt: z.string(),
  labels: z.record(z.string(), z.array(z.string())),
});
export const PublicIndexSchema = z.object({
  version: z.string(),
  run_id: z.string(),
  date: z.string(),
  status: z.enum(['provisional', 'validated']),
  models: z.array(ModelSchema),
  languages: z.array(z.string()),
  categories: z.array(z.string()),
  weights: ScoringWeightsSchema,
  items: z.array(ItemSummarySchema),
  limitations: z.array(z.string()),
  human_calibrated: z.boolean(),
  coverage: z.array(
    z.object({
      model_key: z.string(),
      language: z.string(),
      recorded_samples: z.number(),
      scored_samples: z.number(),
      exclusions: z.record(z.string(), z.number()),
    }),
  ),
});
export const PublicModelSchema = z.object({
  model: ModelSchema,
  groups: z.array(ScoreGroupSchema),
  items: z.array(ScoredItemSchema),
  composite: MetricEstimateSchema,
  metrics: MetricEstimatesSchema,
  language_gaps: z.array(
    z.object({
      language: z.string(),
      split: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
  host_gaps: z.array(
    z.object({
      vendor_model: z.string(),
      other_model: z.string(),
      language: z.string(),
      split: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
  china_specificity: z.array(
    z.object({
      language: z.string(),
      split: z.string(),
      metrics: MetricEstimatesSchema,
    }),
  ),
});
export type PublicIndex = z.infer<typeof PublicIndexSchema>;
export type PublicModel = z.infer<typeof PublicModelSchema>;
export type PublicItem = z.infer<typeof PublicItemSchema>;
