import { createHash } from 'node:crypto';
import type { Item } from '@ccp-bench/schema';
/** Largest remainders preserve category/type representation without overselecting tiny strata. */
export function suggestSplit(
  items: Item[],
  ratio = 0.3,
  seed = 'ccp-bench-v0.1',
) {
  if (!(ratio > 0 && ratio < 1))
    throw new Error('Ratio must be between zero and one');
  const dev = items.filter(
    (i) => i.split === 'dev' && i.review_status !== 'retired',
  );
  const groups = new Map<string, Item[]>();
  for (const item of dev) {
    const key = `${item.category}:${item.type}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const hash = (id: string) =>
    createHash('sha256')
      .update(seed + ':' + id)
      .digest('hex');
  const strata = [...groups].map(([key, rows]) => ({
    key,
    rows: rows.sort((a, b) => hash(a.id).localeCompare(hash(b.id))),
    count: Math.floor(rows.length * ratio),
    remainder: (rows.length * ratio) % 1,
  }));
  let remaining =
    Math.round(dev.length * ratio) - strata.reduce((n, s) => n + s.count, 0);
  for (const stratum of strata.toSorted(
    (a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key),
  )) {
    if (remaining-- <= 0) break;
    stratum.count++;
  }
  return {
    ratio,
    seed,
    proposed_ids: strata.flatMap((s) =>
      s.rows.slice(0, s.count).map((i) => i.id),
    ),
    warning:
      'Proposal only. Existing public items have already been exposed. Moving them does not make them unseen; use separately authored private variants for contamination-sensitive evaluation.',
  };
}
