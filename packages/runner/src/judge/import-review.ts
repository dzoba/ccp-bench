import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { loadBank } from '@ccp-bench/bank';
import { JudgeVerdictSchema, ItemSchema, type Item } from '@ccp-bench/schema';
import { atomicJson, readJson, root, hash } from '../io';
import { CalibrationCaseSchema } from './calibration';
import { parseVerdict } from './verdict';
import { withWriterLock } from './lock';

export const ReviewExportSchema = z.strictObject({
  schema_version: z.literal(1),
  dataset_fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  reviewer: z.string().trim().min(1),
  exported_at: z.iso.datetime(),
  answers: z.array(
    z.strictObject({
      id: z.string(),
      item_id: z.string(),
      status: z.enum(['pending', 'approved', 'corrected', 'flagged']),
      verdict: JudgeVerdictSchema,
      note: z.string(),
      reviewed_at: z.iso.datetime().nullable(),
    }),
  ),
});
export function reviewDataset(
  cases: z.infer<typeof CalibrationCaseSchema>[],
  bank: Item[],
) {
  const items = bank
    .filter((i) => cases.some((c) => c.item_id === i.id))
    .sort(
      (a, b) =>
        cases.findIndex((c) => c.item_id === a.id) -
        cases.findIndex((c) => c.item_id === b.id),
    );
  const content = {
    cases: cases.map(({ id, item_id, response, expected }) => ({
      id,
      item_id,
      response,
      expected,
    })),
    items,
  };
  return {
    ...content,
    fingerprint: createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex'),
  };
}
export function applyReview(
  cases: z.infer<typeof CalibrationCaseSchema>[],
  bank: Item[],
  raw: unknown,
) {
  const review = ReviewExportSchema.parse(raw);
  if (review.dataset_fingerprint !== reviewDataset(cases, bank).fingerprint)
    throw new Error(
      'Review fingerprint differs from the current cases and bank; reconcile the original snapshot before importing',
    );
  if (
    review.answers.length !== cases.length ||
    new Set(review.answers.map((a) => a.id)).size !== cases.length
  )
    throw new Error('Review must include each case exactly once');
  const updated = structuredClone(cases);
  let accepted = 0;
  for (const answer of review.answers) {
    const entry = updated.find((c) => c.id === answer.id);
    if (!entry || entry.item_id !== answer.item_id)
      throw new Error('Review contains an unknown or mismatched case');
    if (answer.status !== 'approved' && answer.status !== 'corrected') continue;
    if (!answer.reviewed_at || answer.reviewed_at > review.exported_at)
      throw new Error(
        'Accepted answers require a review timestamp no later than export',
      );
    const item = bank.find((i) => i.id === entry.item_id)!;
    const verdict = parseVerdict(answer.verdict, item, entry.response);
    if (answer.status === 'approved' && hash(verdict) !== hash(entry.expected))
      throw new Error('Changed verdicts must be explicitly marked corrected');
    entry.expected = verdict;
    entry.human_review = {
      reviewed_by: review.reviewer,
      reviewed_at: answer.reviewed_at,
    };
    accepted++;
  }
  return { cases: updated, review, accepted, pending: cases.length - accepted };
}
export function compatibleReviewBank(
  current: Item[],
  original: Item[],
): Item[] {
  const evidence = (item: Item) => {
    return {
      ...item,
      version: undefined,
      translation_status: undefined,
      prompts: { en: item.prompts.en },
    };
  };
  for (const item of original) {
    const now = current.find((i) => i.id === item.id);
    if (!now || hash(evidence(now)) !== hash(evidence(item)))
      throw new Error(
        'Reviewed English evidence changed; reconcile the original snapshot before importing',
      );
  }
  return original;
}
export async function importReview(path: string, dryRun = false) {
  const destination = join(
    root,
    'packages/runner/fixtures/judge-calibration/cases.json',
  );
  return withWriterLock(destination + '.lock', async () => {
    const cases = await readJson(
      destination,
      z.array(CalibrationCaseSchema).length(40),
    );
    const review = await readJson(path, ReviewExportSchema);
    const bank = await loadBank();
    let originalBank = bank;
    if (review.dataset_fingerprint !== reviewDataset(cases, bank).fingerprint) {
      const snapshot = await readJson(
        join(
          root,
          'runs/calibration/datasets',
          review.dataset_fingerprint + '.json',
        ),
        z.object({ items: z.array(ItemSchema) }),
      );
      // Translation-only changes do not invalidate an English review already in progress.
      // All other displayed evidence and all gold labels must still match.
      originalBank = compatibleReviewBank(bank, snapshot.items);
    }
    const result = applyReview(cases, originalBank, review);
    if (!dryRun) {
      // Preserve every note and unresolved answer, as well as the exact pre-import cases.
      await atomicJson(
        join(root, 'runs/calibration/imports', hash(result.review) + '.json'),
        { review: result.review, before: cases },
      );
      await atomicJson(destination, result.cases);
    }
    return {
      accepted: result.accepted,
      pending: result.pending,
      dry_run: dryRun,
    };
  });
}
