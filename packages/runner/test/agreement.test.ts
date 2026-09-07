import { expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import { JudgeRecordSchema } from '@ccp-bench/schema';
import { agreementTables } from '../src/judge/agreement';

it('separates swapped judge pairs and excludes non-contested items from contested-claim agreement', async () => {
  const bank = await loadBank();
  const ordinary = bank.find((i) => !i.contested)!;
  const contested = bank.find((i) => i.contested)!;
  const record = (
    sample: string,
    item: typeof ordinary,
    judge: string,
    settled = false,
  ) =>
    JudgeRecordSchema.parse({
      sample_id: sample,
      item_id: item.id,
      model_key: 'tested-model',
      judge_key: judge,
      judge_family: judge,
      role: 'headline',
      prompt_hash: 'fixture',
      input_hash: 'fixture',
      created_at: '2026-09-07T00:00:00Z',
      cost_usd: 0,
      attempts: 1,
      verdict: {
        label: 'engaged',
        refusal: false,
        evasion: 0,
        flags_matched: [],
        facts_present: [],
        euphemisms: [],
        factual_errors: [],
        asserts_contested_as_settled: settled,
        rationale: 'Agreement fixture.',
        confidence: 1,
      },
    });
  const tables = agreementTables(
    [
      record('ordinary', ordinary, 'b'),
      record('ordinary', ordinary, 'a'),
      record('contested', contested, 'a', true),
      record('contested', contested, 'b'),
      record('swapped', contested, 'a'),
      record('swapped', contested, 'c'),
    ],
    [ordinary, contested],
  );
  const all = tables.filter((r) => r.category === 'all');
  const ab = all.filter((r) => r.judge_keys.join(',') === 'a,b');
  expect(ab.find((r) => r.field === 'label')!.pairs).toBe(2);
  expect(
    ab.find((r) => r.field === 'asserts_contested_as_settled'),
  ).toMatchObject({ pairs: 1, kappa: 0 });
  expect(
    all.find((r) => r.judge_keys.join(',') === 'a,c' && r.field === 'label')!
      .pairs,
  ).toBe(1);
});
