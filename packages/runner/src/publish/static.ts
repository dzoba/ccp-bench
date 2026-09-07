import { mkdir, writeFile, rm, rename, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { loadBank } from '@ccp-bench/bank';
import {
  ManifestSchema,
  ScoresSchema,
  JudgeRecordSchema,
  HumanReviewSchema,
  ResponseRecordSchema,
  PublicIndexSchema,
  PublicItemSchema,
  PublicModelSchema,
  ScoringWeightsSchema,
  AgreementRowSchema,
  type Item,
  ModelRegistrySchema,
  JudgeConfigSchema,
} from '@ccp-bench/schema';
import { readJson, readJsonl, readYaml, root, hash, atomicJson } from '../io';
import { judgeDirectory } from '../judge/paths';
import {
  CalibrationReportSchema,
  calibrationInputs,
  labelAgreement,
} from '../judge/calibration';

export function assertNoHeldoutLeak(
  files: Record<string, string>,
  heldout: Item[],
) {
  const texts = heldout.flatMap((i) => [
    i.id,
    ...Object.values(i.prompts).filter((p): p is string => !!p),
    ...i.topic_tags
      .filter((t) => t.startsWith('canary:'))
      .map((t) => t.slice(7)),
  ]);
  for (const [name, text] of Object.entries(files)) {
    function strings(value: unknown): string[] {
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value.flatMap(strings);
      if (value && typeof value === 'object')
        return Object.entries(value).flatMap(([key, child]) => [
          key,
          ...strings(child),
        ]);
      return [];
    }
    let decoded = text;
    try {
      decoded += '\n' + strings(JSON.parse(text)).join('\n');
    } catch {
      /* Non-JSON artifacts still receive the raw scan. */
    }
    if (
      /(?:^|["\s/:])h-[a-z]{3}-\d{3}/.test(decoded) ||
      /h-[a-z]{3}-\d{3}/.test(name)
    )
      throw new Error(`Held-out ID in public artifact ${name}`);
    for (const secret of texts)
      if (secret && decoded.includes(secret))
        throw new Error(`Held-out content in public artifact ${name}`);
  }
}
export async function exportStatic(
  runId: string,
  options: {
    judgeSet?: string;
    provisional?: boolean;
    calibration?: string;
    destination?: string;
    dryRun?: boolean;
  } = {},
) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(runId))
    throw new Error('Invalid run ID');
  const directory = join(root, 'runs', runId),
    grades = judgeDirectory(directory, options.judgeSet);
  const manifest = await readJson(
    join(directory, 'manifest.json'),
    ManifestSchema,
  );
  const scores = await readJson(join(grades, 'scores.json'), ScoresSchema);
  const judgments = await readJsonl(
    join(grades, 'judgments.jsonl'),
    JudgeRecordSchema,
  );
  const humans = await readJsonl(
    join(grades, 'human-reviews.jsonl'),
    HumanReviewSchema,
  );
  const responses = await readJsonl(
    join(directory, 'responses.jsonl'),
    ResponseRecordSchema,
  );
  const weights = await readYaml(
    join(root, 'configs/scoring.yaml'),
    ScoringWeightsSchema,
  );
  const agreement = await readJson(
    join(grades, 'agreement.json'),
    z.array(AgreementRowSchema),
  );
  let calibrated = false;
  if (options.calibration) {
    const report = await readJson(options.calibration, CalibrationReportSchema);
    const summary = await readJson(
      join(grades, 'judge-summary.json'),
      z.object({ config: JudgeConfigSchema }),
    );
    const registry = await readYaml(
      join(root, 'configs/models.yaml'),
      ModelRegistrySchema,
    );
    const { identity, cases, judges } = await calibrationInputs(
      registry,
      summary.config,
    );
    calibrated =
      report.passed &&
      cases.every(
        (c) => c.provenance === 'human_authored' || c.human_review !== null,
      ) &&
      Object.entries(identity).every(
        ([key, value]) => report[key as keyof typeof identity] === value,
      ) &&
      judgments.every((j) => j.prompt_hash === identity.prompt_hash) &&
      judges.every((judge) => {
        const actual = cases.map(
          (c) =>
            report.results.find(
              (r) => r.case_id === c.id && r.judge_key === judge.key,
            )?.label,
        );
        return (
          labelAgreement(
            cases.map((c) => c.expected.label),
            actual,
          ) >= 0.85
        );
      });
  }
  const limitations: string[] = [];
  if (!calibrated)
    limitations.push(
      'Human calibration review is pending. Results are provisional.',
    );
  if (!manifest.config.languages.includes('zh-Hans'))
    limitations.push(
      'English-only pilot. The bilingual composite and language gaps are not yet available.',
    );
  if (!manifest.items.some((i) => i.split === 'heldout'))
    limitations.push('This run contains no held-out items.');
  const errors = manifest.models.map((m) => {
    const records = judgments.filter(
      (j) => j.model_key === m.key && j.role === 'headline',
    );
    return {
      model: m.key,
      rate: records.length
        ? records.filter((j) => j.judge_error).length / records.length
        : 1,
    };
  });
  if (errors.some((e) => e.rate > 0.02))
    limitations.push(
      'At least one model exceeds the 2% judge-error threshold.',
    );
  if (
    !options.provisional &&
    (!calibrated || errors.some((e) => e.rate > 0.02))
  )
    throw new Error(
      'Validated publication requires human calibration and no judge-error rate above 2% per model',
    );
  const bank = await loadBank();
  const allItems = [
    ...new Map([...bank, ...manifest.items].map((i) => [i.id, i])).values(),
  ];
  const dev = allItems.filter(
    (i) =>
      i.split === 'dev' &&
      !i.id.startsWith('h-') &&
      i.review_status !== 'retired',
  );
  const status = options.provisional ? 'provisional' : 'validated';
  const version =
    manifest.bench_version +
    '-' +
    runId +
    '-' +
    (options.judgeSet ?? 'default') +
    '-' +
    hash({
      manifest,
      scores,
      judgments,
      humans,
      weights,
      agreement,
      calibrated,
      status,
      allItems,
    }).slice(0, 12);
  if (!/^[\w.-]+$/.test(version)) throw new Error('Unsafe version path');
  const files: Record<string, string> = {};
  const put = (name: string, value: unknown) => {
    files[name] = JSON.stringify(value) + '\n';
  };
  for (const item of dev) {
    const clean = { ...item, notes: undefined };
    put(
      `items/${item.id}.json`,
      PublicItemSchema.parse({
        item: clean,
        transcripts: responses
          .filter((s) => s.item_id === item.id)
          .map((s) => ({
            model_key: s.model_key,
            language: s.lang,
            sample_idx: s.sample_idx,
            text: s.response.text,
            reasoning: s.response.reasoning,
            finish_reason: s.response.finish_reason,
            provider_error: s.response.provider_error,
            filter_layer: s.response.filter_layer,
            judgments: judgments
              .filter((j) => j.sample_id === s.sample_id)
              .map((j) => ({
                judge_key: j.judge_key,
                verdict: j.verdict,
                judge_error: j.judge_error,
              })),
            human: humans
              .filter((h) => h.sample_id === s.sample_id)
              .map((h) => ({ verdict: h.verdict, reviewed_at: h.reviewed_at }))
              .at(-1),
          })),
      }),
    );
  }
  const index = PublicIndexSchema.parse({
    version,
    run_id: runId,
    date: manifest.updated_at,
    status,
    models: manifest.models,
    languages: manifest.config.languages,
    categories: [...new Set(dev.map((i) => i.category))],
    weights,
    limitations,
    human_calibrated: calibrated,
    coverage: scores.coverage,
    items: dev.map((i) => ({
      id: i.id,
      category: i.category,
      type: i.type,
      contested: i.contested,
      prompt: i.prompts.en,
      labels: Object.fromEntries(
        manifest.models.map((m) => [
          m.key,
          [
            ...new Set(
              judgments
                .filter(
                  (j) =>
                    j.item_id === i.id &&
                    j.model_key === m.key &&
                    j.role === 'headline' &&
                    j.verdict,
                )
                .map((j) => j.verdict!.label),
            ),
          ],
        ]),
      ),
    })),
  });
  put('index.json', index);
  put('leaderboard.json', scores.leaderboard);
  put('agreement.json', agreement);
  for (const model of manifest.models) {
    const row = scores.leaderboard.find((r) => r.model_key === model.key)!;
    put(
      `models/${model.key}.json`,
      PublicModelSchema.parse({
        model,
        groups: scores.groups.filter((r) => r.model_key === model.key),
        items: scores.items.filter(
          (r) =>
            r.model_key === model.key &&
            r.split === 'dev' &&
            !r.item_id.startsWith('h-'),
        ),
        composite: row.composite,
        metrics: row.metrics,
        language_gaps: scores.language_gaps.filter(
          (r) => r.model_key === model.key,
        ),
        host_gaps: scores.host_gaps.filter(
          (r) => r.vendor_model === model.key || r.other_model === model.key,
        ),
        china_specificity: scores.china_specificity.filter(
          (r) => r.model_key === model.key,
        ),
      }),
    );
  }
  assertNoHeldoutLeak(
    files,
    allItems.filter((i) => i.split === 'heldout'),
  );
  const bytes = Object.values(files).reduce(
    (n, s) => n + Buffer.byteLength(s),
    0,
  );
  if (bytes > 40 * 1024 * 1024) throw new Error('Published JSON exceeds 40 MB');
  if (!options.dryRun) {
    const parent =
      options.destination ?? join(root, 'packages/web/public/data');
    await mkdir(parent, { recursive: true });
    const temp = join(parent, '.' + randomUUID());
    await mkdir(temp);
    for (const [name, text] of Object.entries(files)) {
      const path = join(temp, name);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, text);
    }
    const destination = join(parent, version);
    try {
      await rename(temp, destination);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        ['EEXIST', 'ENOTEMPTY'].includes(String(error.code))
      ))
        throw error;
      // Content-addressed versions are immutable. Verify an existing version before reusing it.
      for (const [name, text] of Object.entries(files))
        if ((await readFile(join(destination, name), 'utf8')) !== text)
          throw new Error('Existing publication version has different content');
      await rm(temp, { recursive: true });
    }
    await atomicJson(join(parent, 'current.json'), { version });
  }
  return {
    version,
    status,
    files: Object.keys(files).length,
    bytes,
    limitations,
  };
}
