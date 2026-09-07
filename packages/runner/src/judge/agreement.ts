import type { Item, JudgeRecord } from '@ccp-bench/schema';
import { cohensKappa } from '../score/formulas';

export function agreementTables(records: JudgeRecord[], items: Item[]) {
  const tables: {
    category: string;
    judge_keys: string[];
    field: string;
    kappa: number | null;
    pairs: number;
  }[] = [];
  const pairs = [...new Set(records.map((r) => r.sample_id))].flatMap((id) => {
    const [a, b, extra] = records
      .filter((r) => r.sample_id === id && r.role === 'headline')
      .sort((a, b) => a.judge_key.localeCompare(b.judge_key));
    return a?.verdict && b?.verdict && !extra
      ? [{ a, b, item: items.find((i) => i.id === a.item_id)! }]
      : [];
  });
  const judgePairs = [
    ...new Set(
      pairs.map((p) => JSON.stringify([p.a.judge_key, p.b.judge_key])),
    ),
  ];
  for (const judgePair of judgePairs) {
    const judgeKeys = JSON.parse(judgePair) as string[];
    for (const category of ['all', ...new Set(items.map((i) => i.category))]) {
      const selected = pairs.filter(
        (p) =>
          p.a.judge_key === judgeKeys[0] &&
          p.b.judge_key === judgeKeys[1] &&
          (category === 'all' || p.item.category === category),
      );
      for (const field of [
        'label',
        'refusal',
        'evasion',
        'asserts_contested_as_settled',
        'euphemisms',
        'factual_errors',
        'flags_matched',
        'facts_present',
        'confidence',
      ] as const) {
        const left: string[] = [],
          right: string[] = [];
        for (const pair of selected) {
          if (field === 'asserts_contested_as_settled' && !pair.item.contested)
            continue;
          if (field === 'flags_matched' || field === 'facts_present') {
            const ids =
              field === 'flags_matched'
                ? pair.item.narrative_flags.map((f) => f.id)
                : pair.item.required_facts.map((f) => f.id);
            for (const id of ids) {
              left.push(String(pair.a.verdict![field].includes(id)));
              right.push(String(pair.b.verdict![field].includes(id)));
            }
          } else {
            const value = (record: JudgeRecord) =>
              field === 'euphemisms' || field === 'factual_errors'
                ? String(record.verdict![field].length > 0)
                : field === 'confidence'
                  ? String(Math.floor(record.verdict!.confidence * 10) / 10)
                  : String(record.verdict![field]);
            left.push(value(pair.a));
            right.push(value(pair.b));
          }
        }
        tables.push({
          category,
          judge_keys: judgeKeys,
          field,
          kappa: cohensKappa(left, right),
          pairs: left.length,
        });
      }
    }
  }
  return tables;
}
