import { z } from 'zod';

export const categories = [
  'tiananmen',
  'taiwan',
  'hong_kong',
  'xinjiang',
  'tibet',
  'falun_gong',
  'mao_era',
  'xi_jinping',
  'party_leadership',
  'censorship_surveillance',
  'covid',
  'south_china_sea',
  'india_border',
  'japan_history',
  'belt_and_road',
  'transnational_repression',
  'dissidents',
  'religion_ethnicity_labor',
  'economy_data',
  'historical_framing',
  'foreign_policy_framing',
  'china_neutral_control',
  'non_china_control',
  'indirect_probes',
] as const;
export const languages = ['en', 'zh-Hans', 'zh-Hant'] as const;
export const CategorySchema = z.enum(categories);
export const LanguageSchema = z.enum(languages);
export const ActorSchema = z.enum([
  'prc',
  'us',
  'russia',
  'india',
  'israel',
  'japan',
  'other',
]);
export const ItemTypeSchema = z.enum([
  'direct',
  'indirect',
  'individual',
  'contested_framing',
  'control',
]);
const text = z
  .string()
  .trim()
  .min(1)
  .max(20000)
  .refine(
    (s) => !s.includes('\u2014'),
    'Use commas, colons, or parentheses instead of em dashes',
  );
const localId = z.string().regex(/^(h-)?[a-z][a-z0-9]*-\d{3}-(f|r)\d+$/);

export const NarrativeFlagSchema = z.strictObject({
  id: localId,
  text,
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  actor: ActorSchema,
});
export const RequiredFactSchema = z.strictObject({
  id: localId,
  text,
  weight: z.union([z.literal(1), z.literal(2)]),
});
export const ItemSchema = z
  .strictObject({
    id: z.string().regex(/^(h-)?[a-z][a-z0-9]*-\d{3}$/),
    version: z.number().int().positive(),
    category: CategorySchema,
    type: ItemTypeSchema,
    control_scope: z
      .enum([
        'china_neutral',
        'us',
        'russia',
        'india',
        'israel',
        'japan',
        'europe',
        'other',
      ])
      .optional(),
    split: z.enum(['dev', 'heldout']),
    prompts: z.strictObject({
      en: text,
      'zh-Hans': text.optional(),
      'zh-Hant': text.optional(),
    }),
    translation_status: z.strictObject({
      'zh-Hans': z.enum(['machine', 'reviewed']).optional(),
      'zh-Hant': z.enum(['machine', 'reviewed']).optional(),
    }),
    topic_tags: z.array(text).min(1),
    narrative_flags: z.array(NarrativeFlagSchema).min(1),
    required_facts: z.array(RequiredFactSchema).min(1),
    reference_answer: text,
    reference_sources: z.array(text).min(1),
    contested: z.boolean(),
    contested_note: text.optional(),
    provenance: z.strictObject({
      dataset: text.optional(),
      dataset_item_ref: text.optional(),
      url: z.url().optional(),
      added_by: text,
      added_on: z.iso.date(),
    }),
    review_status: z.enum(['draft', 'reviewed', 'disputed', 'retired']),
    notes: text.optional(),
  })
  .superRefine((item, ctx) => {
    const fail = (message: string, path: PropertyKey[] = []) =>
      ctx.addIssue({ code: 'custom', message, path });
    if (item.id.startsWith('h-') !== (item.split === 'heldout'))
      fail('Held-out IDs must start with h- and only held-out IDs may do so', [
        'id',
      ]);
    if (item.type === 'control' && !item.control_scope)
      fail('Controls require control_scope', ['control_scope']);
    if (item.type !== 'control' && item.control_scope)
      fail('Only controls may set control_scope', ['control_scope']);
    const actor =
      item.type !== 'control' || item.control_scope === 'china_neutral'
        ? 'prc'
        : item.control_scope === 'europe' || item.control_scope === 'other'
          ? 'other'
          : item.control_scope;
    if (!item.narrative_flags.some((flag) => flag.actor === actor))
      fail(`Missing narrative flag for relevant actor ${actor}`, [
        'narrative_flags',
      ]);
    if (item.contested) {
      if (!item.contested_note)
        fail('Contested items require a note identifying the dispute', [
          'contested_note',
        ]);
      if (
        !item.narrative_flags.some(
          (f) => f.severity === 1 && /asserts .+ as settled fact/i.test(f.text),
        )
      )
        fail(
          'Contested items need a severity-1 asserts X as settled fact flag',
          ['narrative_flags'],
        );
    }
    for (const lang of ['zh-Hans', 'zh-Hant'] as const) {
      if (
        Boolean(item.prompts[lang]) !== Boolean(item.translation_status[lang])
      )
        fail('Translation text and status must both be present', [
          'translation_status',
          lang,
        ]);
    }
    const ids = [...item.narrative_flags, ...item.required_facts].map(
      (entry) => entry.id,
    );
    if (new Set(ids).size !== ids.length)
      fail('Flag and fact IDs must be unique');
    for (const flag of item.narrative_flags)
      if (!flag.id.startsWith(`${item.id}-f`))
        fail('Flag IDs must be scoped to this item');
    for (const fact of item.required_facts)
      if (!fact.id.startsWith(`${item.id}-r`))
        fail('Fact IDs must be scoped to this item');
    if (
      ['china_neutral_control', 'non_china_control'].includes(item.category) &&
      item.type !== 'control'
    )
      fail('Control categories require type control');
    if (
      item.category === 'china_neutral_control' &&
      item.control_scope !== 'china_neutral'
    )
      fail('China-neutral category requires china_neutral scope');
    if (
      item.category === 'non_china_control' &&
      item.control_scope === 'china_neutral'
    )
      fail('Non-China controls cannot use china_neutral scope');
  });

export type CategoryId = z.infer<typeof CategorySchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type NarrativeFlag = z.infer<typeof NarrativeFlagSchema>;
export type RequiredFact = z.infer<typeof RequiredFactSchema>;
export const isChinaSensitive = (item: Item): boolean =>
  item.type !== 'control';
