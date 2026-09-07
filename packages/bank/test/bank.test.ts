import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { ItemSchema } from '@ccp-bench/schema';
import { bankStats, loadBank, validateBank } from '../src/index';
import { parseSource } from '../src/source';

const items = await loadBank();
const original = items.find((i) => i.id === 'tam-001')!;
describe('public question bank', () => {
  it('preserves every numbered source question exactly once and covers all categories', async () => {
    const source = parseSource(
      await readFile(
        new URL('../../../docs/source/question-bank-v0.md', import.meta.url),
        'utf8',
      ),
    );
    expect(source).toHaveLength(168);
    for (const question of source) {
      const matches = items.filter(
        (i) => i.provenance.dataset_item_ref === String(question.number),
      );
      expect(matches).toHaveLength(1);
      expect(matches[0]!.category).toBe(question.category);
      expect(matches[0]!.notes).toContain(
        question.prompt.replaceAll('\u2014', ','),
      );
      expect(matches[0]!.notes).toContain(
        question.annotation.replaceAll('\u2014', ','),
      );
    }
    expect(items.length).toBeGreaterThanOrEqual(168);
    expect(() =>
      validateBank(items, { requireAllCategories: true }),
    ).not.toThrow();
    expect(bankStats(items).categories_without_indirect_or_control).toEqual([]);
  });
  it('rejects duplicate stable IDs', () => {
    expect(() => validateBank([original, original])).toThrow(
      'Duplicate item ID',
    );
  });
  it('rejects private material in the public bank', () => {
    const privateItem = {
      ...original,
      id: 'h-tam-001',
      split: 'heldout',
      narrative_flags: original.narrative_flags.map((f) => ({
        ...f,
        id: `h-${f.id}`,
      })),
      required_facts: original.required_facts.map((f) => ({
        ...f,
        id: `h-${f.id}`,
      })),
    };
    expect(() => validateBank([ItemSchema.parse(privateItem)])).toThrow(
      'Held-out item in public bank',
    );
  });
  it('rejects empty narrative or fact checklists', () => {
    expect(
      ItemSchema.safeParse({ ...original, narrative_flags: [] }).success,
    ).toBe(false);
    expect(
      ItemSchema.safeParse({ ...original, required_facts: [] }).success,
    ).toBe(false);
  });
  it('requires explicit settlement flags for contested items', () => {
    expect(ItemSchema.safeParse({ ...original, contested: true }).success).toBe(
      false,
    );
    const disputed = items.find((i) => i.contested)!;
    expect(
      ItemSchema.safeParse({
        ...disputed,
        narrative_flags: disputed.narrative_flags.filter(
          (f) => f.severity !== 1,
        ),
      }).success,
    ).toBe(false);
  });
  it('enforces relevant actors for non-China controls', () => {
    const control = items.find((i) => i.control_scope === 'us')!;
    expect(
      ItemSchema.safeParse({
        ...control,
        narrative_flags: control.narrative_flags.map((f) => ({
          ...f,
          actor: 'prc',
        })),
      }).success,
    ).toBe(false);
  });
  it('pairs translation text and status and scopes rubric IDs', () => {
    expect(
      ItemSchema.safeParse({
        ...original,
        prompts: { ...original.prompts, 'zh-Hans': '测试' },
        translation_status: {
          ...original.translation_status,
          'zh-Hans': undefined,
        },
      }).success,
    ).toBe(false);
    expect(
      ItemSchema.safeParse({
        ...original,
        narrative_flags: [{ ...original.narrative_flags[0], id: 'tam-002-f1' }],
      }).success,
    ).toBe(false);
    expect(
      ItemSchema.safeParse({
        ...original,
        narrative_flags: [
          original.narrative_flags[0],
          original.narrative_flags[0],
        ],
      }).success,
    ).toBe(false);
  });
});
