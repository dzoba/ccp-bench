import { expect, it } from 'vitest';
import { loadBank } from '../src/index';
import { suggestSplit } from '../src/split';
it('suggests a deterministic stratified target without mutating the bank', async () => {
  const items = await loadBank();
  const before = JSON.stringify(items);
  const result = suggestSplit(items);
  expect(result.proposed_ids).toHaveLength(Math.round(items.length * 0.3));
  expect(new Set(result.proposed_ids).size).toBe(result.proposed_ids.length);
  expect(suggestSplit([...items].reverse()).proposed_ids.toSorted()).toEqual(
    result.proposed_ids.toSorted(),
  );
  expect(JSON.stringify(items)).toBe(before);
});
