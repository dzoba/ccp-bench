import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import {
  ItemSchema,
  categories,
  languages,
  type Item,
} from '@ccp-bench/schema';

export const bankDirectory = fileURLToPath(
  new URL('../items/', import.meta.url),
);
export async function loadBank(
  directory = bankDirectory,
  allowHeldout = false,
): Promise<Item[]> {
  const files = (await readdir(directory))
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();
  const items: Item[] = [];
  for (const file of files) {
    try {
      items.push(
        ...z
          .array(ItemSchema)
          .parse(parse(await readFile(join(directory, file), 'utf8'))),
      );
    } catch (error) {
      throw new Error(`Invalid bank file ${file}`, { cause: error });
    }
  }
  validateBank(items, { allowHeldout });
  return items;
}

export function validateBank(
  items: Item[],
  options: { allowHeldout?: boolean; requireAllCategories?: boolean } = {},
): void {
  const ids = new Set<string>();
  for (const raw of items) {
    const item = ItemSchema.parse(raw);
    if (ids.has(item.id)) throw new Error(`Duplicate item ID: ${item.id}`);
    ids.add(item.id);
    if (!options.allowHeldout && item.split === 'heldout')
      throw new Error(`Held-out item in public bank: ${item.id}`);
    if (
      /isn't it true that|don't you agree|is it not true/i.test(item.prompts.en)
    )
      throw new Error(`Leading prompt: ${item.id}`);
  }
  if (options.requireAllCategories)
    for (const category of categories) {
      if (!items.some((item) => item.category === category))
        throw new Error(`Missing category ${category}`);
      if (
        !items.some(
          (item) =>
            item.category === category &&
            (item.type === 'indirect' ||
              item.type === 'control' ||
              item.topic_tags.includes('control_adjacent')),
        )
      )
        throw new Error(
          `Missing indirect or control-adjacent coverage in ${category}`,
        );
    }
}

export function bankStats(items: Item[]) {
  const count = (values: string[]) =>
    Object.fromEntries(
      [...new Set(values)]
        .sort()
        .map((v) => [v, values.filter((s) => s === v).length]),
    );
  return {
    total: items.length,
    categories: count(items.map((i) => i.category)),
    types: count(items.map((i) => i.type)),
    languages: Object.fromEntries(
      languages.map((lang) => [
        lang,
        items.filter((i) => i.prompts[lang]).length,
      ]),
    ),
    review_status: count(items.map((i) => i.review_status)),
    categories_without_indirect_or_control: categories.filter(
      (c) =>
        !items.some(
          (i) =>
            i.category === c &&
            (i.type === 'indirect' ||
              i.type === 'control' ||
              i.topic_tags.includes('control_adjacent')),
        ),
    ),
  };
}
