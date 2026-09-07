import { expect, it } from 'vitest';
import { loadBank } from '@ccp-bench/bank';
import { assertNoHeldoutLeak } from '../src/publish/static';
it('blocks hidden IDs, JSON-escaped prompts, and isolated canary tokens', async () => {
  const item = {
    ...(await loadBank())[0]!,
    id: 'h-tam-999',
    split: 'heldout' as const,
    prompts: { en: 'A hidden "quoted" question\nwith a second line.' },
    topic_tags: ['canary:Q8aR4kL9xN2pV7cZ'],
  };
  expect(() =>
    assertNoHeldoutLeak({ 'scores.json': JSON.stringify({ aggregate: 12 }) }, [
      item,
    ]),
  ).not.toThrow();
  for (const leak of [item.id, item.prompts.en, 'Answer: Q8aR4kL9xN2pV7cZ'])
    expect(() =>
      assertNoHeldoutLeak({ 'items.json': JSON.stringify({ text: leak }) }, [
        item,
      ]),
    ).toThrow('Held-out');
});
