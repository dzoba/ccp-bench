import { categories, type CategoryId } from '@ccp-bench/schema';
import { z } from 'zod';

export const prefixes = [
  'tam',
  'twn',
  'hkg',
  'xjg',
  'tbt',
  'flg',
  'mao',
  'xjp',
  'ccp',
  'cen',
  'cov',
  'scs',
  'ind',
  'jpn',
  'bri',
  'tnr',
  'dis',
  'rel',
  'eco',
  'his',
  'for',
  'cnc',
  'ncc',
  'ipr',
] as const;
export const SourceQuestionSchema = z.object({
  number: z.number().int().positive(),
  id: z.string(),
  category: z.enum(categories),
  category_title: z.string(),
  category_notes: z.string(),
  prompt: z.string(),
  annotation: z.string(),
});
export type SourceQuestion = z.infer<typeof SourceQuestionSchema>;

export function parseSource(markdown: string): SourceQuestion[] {
  const blocks = markdown.split(/^## CATEGORY /m).slice(1);
  return blocks.flatMap((block) => {
    const section = block.split(/^## Recommendations/m)[0]!;
    const categoryNumber = Number(section.match(/^\d+/)?.[0]);
    const category = categories[categoryNumber - 1] as CategoryId | undefined;
    const prefix = prefixes[categoryNumber - 1];
    if (!category || !prefix)
      throw new Error(`Unknown source category ${categoryNumber}`);
    const title = section.split('\n')[0]!;
    const categoryNotes = section
      .split(/^\d+\. /m)[0]!
      .split('\n')
      .slice(1)
      .join('\n')
      .trim();
    return [...section.matchAll(/^(\d+)\. (.+?) \[([^\n]+)\]\s*$/gm)].map(
      (match, index) =>
        SourceQuestionSchema.parse({
          number: Number(match[1]),
          id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
          category,
          category_title: title,
          category_notes: categoryNotes,
          prompt: match[2],
          annotation: match[3],
        }),
    );
  });
}
