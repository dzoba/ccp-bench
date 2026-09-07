import { describe, expect, it } from 'vitest';
import {
  ReviewDatasetSchema,
  exportReview,
  initialSession,
} from '../src/calibration-review/model';
const fixture = ReviewDatasetSchema.parse({
  fingerprint: 'software-test-only',
  items: [],
  cases: ['fixture-a', 'fixture-b'].map((id) => ({
    id,
    item_id: 'arithmetic-fixture',
    response: 'Four.',
    expected: {
      label: 'engaged',
      refusal: false,
      evasion: 0,
      flags_matched: [],
      facts_present: [],
      euphemisms: [],
      factual_errors: [],
      asserts_contested_as_settled: false,
      rationale: 'Isolated export fixture.',
      confidence: 1,
    },
  })),
});
describe('portable review export', () => {
  it('starts every case pending and requires reviewer identity', () => {
    const session = initialSession(fixture);
    expect(
      Object.values(session.decisions).every(
        (d) => d.status === 'pending' && d.reviewed_at === null,
      ),
    ).toBe(true);
    expect(() => exportReview(fixture, session)).toThrow('Enter your name');
  });
  it('round-trips partial decisions and notes without approving pending cases or mutating references', () => {
    const session = initialSession(fixture);
    session.reviewer = '  Isolated software fixture  ';
    session.decisions['fixture-a'] = {
      ...session.decisions['fixture-a']!,
      status: 'flagged',
      note: 'Discuss this example.',
      reviewed_at: '2026-09-07T00:00:00Z',
    };
    const result = JSON.parse(JSON.stringify(exportReview(fixture, session)));
    expect(result.dataset_fingerprint).toBe('software-test-only');
    expect(result.reviewer).toBe('Isolated software fixture');
    expect(result.answers[0]).toMatchObject({
      id: 'fixture-a',
      status: 'flagged',
      note: 'Discuss this example.',
    });
    expect(result.answers[1]).toMatchObject({
      id: 'fixture-b',
      status: 'pending',
      reviewed_at: null,
    });
    expect(fixture.cases[0]!.expected.rationale).toBe(
      'Isolated export fixture.',
    );
  });
});
