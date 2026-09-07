import { expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import { readJson, root } from '../src/io';
import { join } from 'node:path';
import { z } from 'zod';
import { CalibrationCaseSchema } from '../src/judge/calibration';
import {
  applyReview,
  reviewDataset,
  compatibleReviewBank,
} from '../src/judge/import-review';
it('imports explicit decisions in memory, preserves unresolved cases, and rejects stale or altered approvals', async () => {
  const cases = await readJson(
    join(root, 'packages/runner/fixtures/judge-calibration/cases.json'),
    z.array(CalibrationCaseSchema),
  );
  const bank = await loadBank();
  const review = {
    schema_version: 1,
    dataset_fingerprint: reviewDataset(cases, bank).fingerprint,
    reviewer: 'Isolated test fixture',
    exported_at: '2026-09-07T20:00:00.000Z',
    answers: cases.map((c, i) => ({
      id: c.id,
      item_id: c.item_id,
      status: i === 0 ? 'approved' : i === 1 ? 'flagged' : 'pending',
      verdict: c.expected,
      note: 'Fixture only',
      reviewed_at: i === 0 ? '2026-09-07T19:00:00.000Z' : null,
    })),
  };
  const result = applyReview(cases, bank, review);
  expect(result.accepted).toBe(1);
  expect(result.pending).toBe(39);
  expect(result.cases[0]!.human_review?.reviewed_by).toBe(
    'Isolated test fixture',
  );
  expect(result.cases[1]!.human_review).toEqual(cases[1]!.human_review);
  expect(cases[0]!.human_review).toBeNull();
  expect(() =>
    applyReview(cases, bank, {
      ...review,
      dataset_fingerprint: '0'.repeat(64),
    }),
  ).toThrow('fingerprint');
  const changed = structuredClone(review);
  changed.answers[0]!.verdict.rationale = 'A different explanation';
  expect(() => applyReview(cases, bank, changed)).toThrow('corrected');
  expect(() =>
    applyReview(cases, bank, {
      ...review,
      answers: [review.answers[0], ...review.answers.slice(0, -1)],
    }),
  ).toThrow('exactly once');
});

it('keeps English reviews valid across translation-only changes but rejects changed evidence', async () => {
  const original = (await loadBank()).slice(0, 1);
  const current = structuredClone(original);
  current[0]!.version++;
  current[0]!.prompts['zh-Hans'] = '测试问题';
  current[0]!.translation_status['zh-Hans'] = 'machine';
  expect(compatibleReviewBank(current, original)).toEqual(original);
  current[0]!.required_facts[0]!.text += ' Changed claim.';
  expect(() => compatibleReviewBank(current, original)).toThrow(
    'evidence changed',
  );
});

it('supports subsequent partial downloads from the same original page and revokes unresolved approvals', async () => {
  const cases = await readJson(
    join(root, 'packages/runner/fixtures/judge-calibration/cases.json'),
    z.array(CalibrationCaseSchema),
  );
  const bank = await loadBank();
  const snapshot = reviewDataset(cases, bank);
  const review = {
    schema_version: 1,
    dataset_fingerprint: snapshot.fingerprint,
    reviewer: 'In-memory fixture',
    exported_at: '2026-09-07T20:00:00.000Z',
    answers: cases.map((c, i) => ({
      id: c.id,
      item_id: c.item_id,
      status: i === 0 ? 'corrected' : 'pending',
      verdict: {
        ...c.expected,
        ...(i === 0 ? { rationale: 'First explicit fixture correction.' } : {}),
      },
      note: '',
      reviewed_at: i === 0 ? '2026-09-07T19:00:00.000Z' : null,
    })),
  };
  const first = applyReview(cases, bank, review, snapshot);
  const later = structuredClone(review);
  later.exported_at = '2026-09-07T22:00:00.000Z';
  later.answers[0]!.status = 'flagged';
  later.answers[0]!.reviewed_at = null;
  const second = applyReview(first.cases, bank, later, snapshot);
  expect(second.accepted).toBe(0);
  expect(second.cases[0]!.human_review).toBeNull();
  expect(second.cases[0]!.expected.rationale).toBe(
    'First explicit fixture correction.',
  );
  later.answers[0]!.status = 'corrected';
  later.answers[0]!.reviewed_at = '2026-09-07T21:00:00.000Z';
  later.answers[0]!.verdict.rationale = 'Second explicit fixture correction.';
  const third = applyReview(second.cases, bank, later, snapshot);
  expect(third.accepted).toBe(1);
  expect(third.cases[0]!.expected.rationale).toBe(
    'Second explicit fixture correction.',
  );
  expect(() => applyReview(third.cases, bank, review, snapshot)).toThrow(
    'predates',
  );
});
