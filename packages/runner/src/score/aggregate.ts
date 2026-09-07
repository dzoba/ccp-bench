import { join } from 'node:path';
import {
  HumanReviewSchema,
  JudgeRecordSchema,
  ManifestSchema,
  ResponseRecordSchema,
  ScoresSchema,
  type ScoringWeights,
  type Scores,
} from '@ccp-bench/schema';
import { atomicJson, readJson, readJsonl } from '../io';
import { isTruncated } from '../providers/types';
import { judgeDirectory } from '../judge/paths';
import { parseVerdict } from '../judge/verdict';
import {
  aggregateItems,
  averageMetrics,
  mean,
  compositeOverItems,
  difference,
  metricNames,
  pairedDifference,
  sampleMetrics,
  type Estimates,
  type Metrics,
} from './formulas';

export async function scoreRun(
  directory: string,
  weights: ScoringWeights,
  judgeSet = 'default',
): Promise<Scores> {
  const manifest = await readJson(
    join(directory, 'manifest.json'),
    ManifestSchema,
  );
  const responses = await readJsonl(
    join(directory, 'responses.jsonl'),
    ResponseRecordSchema,
  );
  const output = judgeDirectory(directory, judgeSet);
  const judgments = await readJsonl(
    join(output, 'judgments.jsonl'),
    JudgeRecordSchema,
  );
  const humanRecords = await readJsonl(
    join(output, 'human-reviews.jsonl'),
    HumanReviewSchema,
  );
  const humans = new Map(humanRecords.map((r) => [r.sample_id, r]));
  const scored: Scores['items'] = [];
  const actorValues = new Map<string, number[]>();
  const exclusions = {
    provider_error: 0,
    api_filter: 0,
    truncated: 0,
    missing_judges: 0,
  };
  const coverage: Scores['coverage'] = manifest.models.flatMap((model) =>
    manifest.config.languages.map((language) => ({
      model_key: model.key,
      language,
      recorded_samples: 0,
      scored_samples: 0,
      exclusions: { ...exclusions },
    })),
  );
  for (const sample of responses) {
    const count = coverage.find(
      (row) =>
        row.model_key === sample.model_key && row.language === sample.lang,
    );
    if (!count)
      throw new Error('Response model or language absent from manifest');
    count.recorded_samples++;
    if (sample.response.provider_error) {
      exclusions.provider_error++;
      count.exclusions.provider_error++;
      continue;
    }
    if (sample.response.filter_layer === 'api') {
      exclusions.api_filter++;
      count.exclusions.api_filter++;
      continue;
    }
    if (isTruncated(sample.response)) {
      exclusions.truncated++;
      count.exclusions.truncated++;
      continue;
    }
    const item = manifest.items.find((i) => i.id === sample.item_id)!;
    const human = humans.get(sample.sample_id);
    const pair = judgments.filter(
      (j) => j.sample_id === sample.sample_id && j.role === 'headline',
    );
    if (
      !human &&
      (pair.length !== 2 ||
        pair.some((j) => !j.verdict) ||
        new Set(pair.map((j) => j.judge_family)).size !== 2)
    ) {
      exclusions.missing_judges++;
      count.exclusions.missing_judges++;
      continue;
    }
    const target = manifest.models.find((m) => m.key === sample.model_key)!;
    if (pair.some((j) => j.judge_family === target.family))
      throw new Error('Self-family judgment found in artifact');
    const verdicts = human
      ? [parseVerdict(human.verdict, item, sample.response.text)]
      : pair.map((j) => parseVerdict(j.verdict, item, sample.response.text));
    count.scored_samples++;
    const scope = item.control_scope;
    const actor =
      item.type !== 'control' || scope === 'china_neutral' || !scope
        ? 'prc'
        : scope === 'europe'
          ? 'other'
          : scope;
    const actorKey = `${sample.model_key}:${sample.lang}:${item.id}`;
    const values = actorValues.get(actorKey) ?? [];
    values.push(mean(verdicts.map((v) => sampleMetrics(item, v, actor).nas!))!);
    actorValues.set(actorKey, values);
    scored.push({
      model_key: sample.model_key,
      language: sample.lang,
      split: sample.split,
      item_id: item.id,
      category: item.category,
      type: item.type,
      scope:
        item.category === 'non_china_control'
          ? 'non_china_control'
          : item.type === 'control'
            ? 'china_neutral_control'
            : 'china_sensitive',
      metrics: averageMetrics(verdicts.map((v) => sampleMetrics(item, v))),
    });
  }
  const items: Scores['items'] = [];
  const grouped = new Map<string, typeof scored>();
  for (const row of scored) {
    const key = `${row.model_key}:${row.language}:${row.item_id}`;
    const group = grouped.get(key) ?? [];
    group.push(row);
    grouped.set(key, group);
  }
  for (const group of grouped.values())
    items.push({
      ...group[0]!,
      metrics: averageMetrics(group.map((r) => r.metrics)),
    });
  const groups: Scores['groups'] = [];
  for (const model of manifest.models)
    for (const language of [...manifest.config.languages, 'all'])
      for (const split of ['dev', 'heldout', 'all'])
        for (const scope of [
          'china_sensitive',
          'non_china_control',
          'china_neutral_control',
        ] as const) {
          const selected = items.filter(
            (r) =>
              r.model_key === model.key &&
              (language === 'all' || r.language === language) &&
              (split === 'all' || r.split === split) &&
              r.scope === scope,
          );
          if (!selected.length) continue;
          const breakdowns = [
            { category: 'all', type: 'all', rows: selected },
            ...[...new Set(selected.map((r) => r.category))].map(
              (category) => ({
                category,
                type: 'all',
                rows: selected.filter((r) => r.category === category),
              }),
            ),
            ...[...new Set(selected.map((r) => r.type))].map((type) => ({
              category: 'all',
              type,
              rows: selected.filter((r) => r.type === type),
            })),
          ];
          for (const group of breakdowns)
            groups.push({
              model_key: model.key,
              language,
              split,
              scope,
              category: group.category,
              type: group.type,
              metrics: aggregateItems(group.rows),
            });
        }
  const leaderboard = manifest.models
    .map((model) => {
      const selected = items.filter(
        (r) =>
          r.model_key === model.key &&
          r.scope === 'china_sensitive' &&
          ['en', 'zh-Hans'].includes(r.language),
      );
      return {
        model_key: model.key,
        composite: compositeOverItems(selected, weights),
        metrics: aggregateItems(selected),
      };
    })
    .sort(
      (a, b) =>
        (b.composite.mean ?? -Infinity) - (a.composite.mean ?? -Infinity),
    );
  const chinaSpecificity: Scores['china_specificity'] = [];
  const languageGaps: Scores['language_gaps'] = [];
  const hostGaps: Scores['host_gaps'] = [];
  function itemMap(
    model: string,
    language: string,
    split: string,
  ): Map<string, Metrics> {
    return new Map(
      items
        .filter(
          (r) =>
            r.model_key === model &&
            r.language === language &&
            (split === 'all' || r.split === split) &&
            r.scope === 'china_sensitive',
        )
        .map((r) => [r.item_id, r.metrics]),
    );
  }
  for (const model of manifest.models)
    for (const split of ['dev', 'heldout', 'all']) {
      for (const language of manifest.config.languages) {
        const china = groups.find(
          (g) =>
            g.model_key === model.key &&
            g.language === language &&
            g.split === split &&
            g.scope === 'china_sensitive' &&
            g.category === 'all' &&
            g.type === 'all',
        );
        const control = groups.find(
          (g) =>
            g.model_key === model.key &&
            g.language === language &&
            g.split === split &&
            g.scope === 'non_china_control' &&
            g.category === 'all' &&
            g.type === 'all',
        );
        if (china && control)
          chinaSpecificity.push({
            model_key: model.key,
            language,
            split,
            metrics: Object.fromEntries(
              metricNames.map((key) => [
                key,
                key === 'nas'
                  ? difference(
                      aggregateItems(
                        items
                          .filter(
                            (r) =>
                              r.model_key === model.key &&
                              r.language === language &&
                              (split === 'all' || r.split === split) &&
                              r.scope === 'china_sensitive',
                          )
                          .map((r) => ({
                            ...r,
                            metrics: {
                              ...r.metrics,
                              nas: mean(
                                actorValues.get(
                                  `${r.model_key}:${r.language}:${r.item_id}`,
                                ) ?? [],
                              ),
                            },
                          })),
                      ).nas,
                      aggregateItems(
                        items
                          .filter(
                            (r) =>
                              r.model_key === model.key &&
                              r.language === language &&
                              (split === 'all' || r.split === split) &&
                              r.scope === 'non_china_control',
                          )
                          .map((r) => ({
                            ...r,
                            metrics: {
                              ...r.metrics,
                              nas: mean(
                                actorValues.get(
                                  `${r.model_key}:${r.language}:${r.item_id}`,
                                ) ?? [],
                              ),
                            },
                          })),
                      ).nas,
                    )
                  : difference(china.metrics[key], control.metrics[key]),
              ]),
            ) as Estimates,
          });
      }
      for (const language of ['zh-Hans', 'zh-Hant'])
        languageGaps.push({
          model_key: model.key,
          split,
          language,
          metrics: pairedDifference(
            itemMap(model.key, language, split),
            itemMap(model.key, 'en', split),
          ),
        });
      if (model.host === 'vendor' && model.weights === 'open')
        for (const other of manifest.models.filter(
          (m) => m.weights_id === model.weights_id && m.host !== 'vendor',
        ))
          for (const language of manifest.config.languages)
            hostGaps.push({
              vendor_model: model.key,
              other_model: other.key,
              language,
              split,
              metrics: pairedDifference(
                itemMap(model.key, language, split),
                itemMap(other.key, language, split),
              ),
            });
    }
  const result = ScoresSchema.parse({
    run_id: manifest.run_id,
    bench_version: manifest.bench_version,
    groups,
    items,
    leaderboard,
    china_specificity: chinaSpecificity,
    language_gaps: languageGaps,
    host_gaps: hostGaps,
    exclusions,
    coverage,
  });
  await atomicJson(join(output, 'scores.json'), result);
  return result;
}
