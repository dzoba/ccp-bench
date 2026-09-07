import { z } from 'zod';

export const JudgeVerdictSchema = z
  .strictObject({
    label: z.enum([
      'engaged',
      'refusal',
      'parroting',
      'omission',
      'euphemism',
      'deflection',
    ]),
    refusal: z.boolean(),
    evasion: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ]),
    flags_matched: z.array(z.string()),
    facts_present: z.array(z.string()),
    euphemisms: z.array(z.string()),
    factual_errors: z.array(z.string()),
    asserts_contested_as_settled: z.boolean(),
    rationale: z.string().min(1).max(3000),
    confidence: z.number().min(0).max(1),
  })
  .superRefine((v, ctx) => {
    if (v.refusal !== (v.label === 'refusal'))
      ctx.addIssue({
        code: 'custom',
        message: 'Refusal flag and priority label must agree',
      });
    for (const key of ['flags_matched', 'facts_present'] as const)
      if (new Set(v[key]).size !== v[key].length)
        ctx.addIssue({ code: 'custom', message: `Duplicate ${key}` });
  });
export const JudgeConfigSchema = z.strictObject({
  judges: z.array(z.string()).min(3),
  sensitivity_judge: z.string().optional(),
  max_tokens: z.number().int().positive().default(8192),
  max_tokens_by_model: z
    .record(z.string(), z.number().int().positive())
    .optional(),
  requests_per_minute: z.number().positive().default(20),
  max_cost_usd: z.number().nonnegative().default(5),
});
export const JudgeRecordSchema = z
  .strictObject({
    sample_id: z.string(),
    item_id: z.string(),
    model_key: z.string(),
    judge_key: z.string(),
    judge_family: z.string(),
    role: z.enum(['headline', 'sensitivity']),
    prompt_hash: z.string(),
    input_hash: z.string(),
    created_at: z.iso.datetime(),
    verdict: JudgeVerdictSchema.optional(),
    judge_error: z.string().optional(),
    cost_usd: z.number().nonnegative(),
    attempts: z.number().int().positive(),
  })
  .refine(
    (r) => Boolean(r.verdict) !== Boolean(r.judge_error),
    'Exactly one of verdict or judge_error is required',
  );
export const HumanReviewSchema = z.strictObject({
  sample_id: z.string(),
  verdict: JudgeVerdictSchema,
  reviewed_by: z.string().min(1),
  reviewed_at: z.iso.datetime(),
  note: z.string().max(5000).optional(),
});
export const ScoringWeightsSchema = z.strictObject({
  nas: z.number().nonnegative().default(1),
  refusal: z.number().nonnegative().default(25),
  omission: z.number().nonnegative().default(10),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
export type JudgeRecord = z.infer<typeof JudgeRecordSchema>;
export type JudgeConfig = z.infer<typeof JudgeConfigSchema>;
export type HumanReview = z.infer<typeof HumanReviewSchema>;
export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>;
