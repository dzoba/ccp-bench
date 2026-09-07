import { z } from 'zod';
import { ItemSchema, JudgeVerdictSchema } from '@ccp-bench/schema';

export const ReviewDatasetSchema = z.object({
  fingerprint: z.string(),
  cases: z.array(
    z.object({
      id: z.string(),
      item_id: z.string(),
      response: z.string(),
      expected: JudgeVerdictSchema,
    }),
  ),
  items: z.array(ItemSchema),
});
export type Dataset = z.infer<typeof ReviewDatasetSchema>;
export type Verdict = z.infer<typeof JudgeVerdictSchema>;
export const DecisionSchema = z.object({
  status: z.enum(['pending', 'approved', 'corrected', 'flagged']),
  verdict: JudgeVerdictSchema,
  note: z.string(),
  reviewed_at: z.string().nullable(),
});
export const SessionSchema = z.object({
  reviewer: z.string(),
  decisions: z.record(z.string(), DecisionSchema),
});
export type Decision = z.infer<typeof DecisionSchema>;
export type Session = z.infer<typeof SessionSchema>;

export function initialSession(data: Dataset): Session {
  return {
    reviewer: '',
    decisions: Object.fromEntries(
      data.cases.map((c) => [
        c.id,
        { status: 'pending', verdict: c.expected, note: '', reviewed_at: null },
      ]),
    ),
  };
}
export function exportReview(data: Dataset, session: Session) {
  if (!session.reviewer.trim())
    throw new Error('Enter your name before downloading.');
  return {
    schema_version: 1,
    dataset_fingerprint: data.fingerprint,
    reviewer: session.reviewer.trim(),
    exported_at: new Date().toISOString(),
    answers: data.cases.map((c) => ({
      id: c.id,
      item_id: c.item_id,
      ...session.decisions[c.id],
    })),
  };
}
