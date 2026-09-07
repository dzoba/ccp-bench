import { describe, expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import { JudgeConfigSchema, ModelSchema } from '@ccp-bench/schema';
import { parseVerdict, requiresReview } from '../src/judge/verdict';
import { selectJudges } from '../src/judge/pipeline';

const item = (await loadBank()).find((i) => i.id === 'tam-001')!;
const verdict = {
  label: 'engaged',
  refusal: false,
  evasion: 0,
  flags_matched: [],
  facts_present: item.required_facts.map((f) => f.id),
  euphemisms: [],
  factual_errors: [],
  asserts_contested_as_settled: false,
  rationale: 'Both facts are supplied.',
  confidence: 0.95,
};
describe('judge validation and family assignment', () => {
  it('rejects invented rubric IDs, invented quotations, and wrong priority labels', () => {
    expect(() =>
      parseVerdict({ ...verdict, flags_matched: ['made-up'] }, item, 'Answer'),
    ).toThrow('Unknown');
    expect(() =>
      parseVerdict(
        { ...verdict, euphemisms: ['missing phrase'] },
        item,
        'Answer',
      ),
    ).toThrow('verbatim');
    expect(() =>
      parseVerdict({ ...verdict, facts_present: [] }, item, 'Answer'),
    ).toThrow('priority');
    expect(() =>
      parseVerdict(
        { ...verdict, asserts_contested_as_settled: true },
        item,
        'Answer',
      ),
    ).toThrow('Non-contested');
    expect(parseVerdict(verdict, item, 'Answer').label).toBe('engaged');
  });
  it('queues label or severe factual-denial disagreements for human review', () => {
    const a = parseVerdict(verdict, item, 'Answer');
    const b = {
      ...a,
      label: 'parroting' as const,
      flags_matched: [item.narrative_flags[0]!.id],
    };
    expect(requiresReview(item, a, b)).toBe(true);
    expect(requiresReview(item, a, a)).toBe(false);
  });
  it('swaps in a third non-PRC family rather than judging its own family', () => {
    const registry = ['a', 'b', 'c'].map((family) =>
      ModelSchema.parse({
        key: family,
        display: family,
        vendor: family,
        origin: 'us',
        weights: 'closed',
        family,
        weights_id: family,
        host: 'vendor',
        endpoint: { provider: 'mock', model: family },
        release_date: '2026-09-07',
      }),
    );
    const config = JudgeConfigSchema.parse({ judges: ['a', 'b', 'c'] });
    expect(
      selectJudges(registry[0]!, registry, config).map((m) => m.family),
    ).toEqual(['b', 'c']);
    expect(() =>
      selectJudges(
        registry[0]!,
        registry.map((m) => ({ ...m, family: 'same' })),
        config,
      ),
    ).toThrow('three distinct');
    expect(() =>
      selectJudges(
        registry[0]!,
        [{ ...registry[0]!, origin: 'prc' }, ...registry.slice(1)],
        config,
      ),
    ).toThrow('non-PRC');
  });
});
