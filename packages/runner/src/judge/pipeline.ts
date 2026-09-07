import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  JudgeRecordSchema,
  JudgeVerdictSchema,
  ManifestSchema,
  ResponseRecordSchema,
  type JudgeConfig,
  type JudgeRecord,
  type Model,
  type Prices,
} from '@ccp-bench/schema';
import { appendJsonl, atomicJson, hash, readJson, readJsonl } from '../io';
import { createProvider, verifyModels } from '../providers';
import { isTruncated, ProviderError, type Provider } from '../providers/types';
import { TokenBucket } from '../scheduler';
import { responseCost } from '../estimate';
import { parseVerdict, requiresReview } from './verdict';
import { judgeTokenLimit } from './settings';
import { judgeDirectory } from './paths';
import { agreementTables } from './agreement';
import { withWriterLock } from './lock';

export function selectJudges(
  target: Model,
  registry: Model[],
  config: JudgeConfig,
): Model[] {
  const choices = config.judges.map((key) => {
    const judge = registry.find((m) => m.key === key);
    if (!judge) throw new Error(`Unknown judge ${key}`);
    return judge;
  });
  if (choices.some((m) => m.origin === 'prc'))
    throw new Error('Headline judges must be non-PRC');
  if (new Set(choices.map((m) => m.family)).size < 3)
    throw new Error(
      'At least three distinct non-PRC judge families are required for swaps',
    );
  const eligible: Model[] = [];
  for (const model of choices)
    if (
      model.family !== target.family &&
      !eligible.some((j) => j.family === model.family)
    )
      eligible.push(model);
  if (eligible.length < 2)
    throw new Error(`No valid two-family judge pair for ${target.key}`);
  return eligible.slice(0, 2);
}
export async function judgeRun(
  ...args: Parameters<typeof judgeRunUnlocked>
): Promise<JudgeRecord[]> {
  const [directory, , , , options] = args;
  return withWriterLock(
    join(judgeDirectory(directory, options?.judgeSet), 'judge-writer.lock'),
    () => judgeRunUnlocked(...args),
  );
}
async function judgeRunUnlocked(
  directory: string,
  registry: Model[],
  prices: Prices,
  config: JudgeConfig,
  options: {
    providerFactory?: (model: Model) => Provider;
    log?: (line: string) => void;
    judgeSet?: string;
    concurrency?: number;
    signal?: AbortSignal;
  } = {},
): Promise<JudgeRecord[]> {
  const manifest = await readJson(
    join(directory, 'manifest.json'),
    ManifestSchema,
  );
  const responses = await readJsonl(
    join(directory, 'responses.jsonl'),
    ResponseRecordSchema,
  );
  const system = await readFile(
    new URL('prompts/v1.md', import.meta.url),
    'utf8',
  );
  const schema = z.toJSONSchema(JudgeVerdictSchema);
  const promptHash = hash({ system, schema });
  const output = judgeDirectory(directory, options.judgeSet);
  const file = join(output, 'judgments.jsonl');
  const existing = await readJsonl(file, JudgeRecordSchema, true);
  const factory = options.providerFactory ?? createProvider;
  const log = options.log ?? console.log;
  const selected = manifest.models.flatMap((m) =>
    selectJudges(m, registry, config),
  );
  const sensitivity = config.sensitivity_judge
    ? registry.find((m) => m.key === config.sensitivity_judge)
    : undefined;
  if (
    config.sensitivity_judge &&
    (!sensitivity || sensitivity.origin !== 'prc')
  )
    throw new Error(
      'Sensitivity judge must be an available PRC-origin registry model',
    );
  const allModels = [
    ...new Map(
      [...selected, ...(sensitivity ? [sensitivity] : [])].map((m) => [
        m.key,
        m,
      ]),
    ).values(),
  ];
  await verifyModels(allModels, factory);
  const tokenCapEstimate =
    (responses.length *
      2 *
      config.max_tokens *
      Math.max(
        ...allModels.map((m) => {
          const price = prices[m.key];
          if (!price) throw new Error(`Missing judge price ${m.key}`);
          return price.output_per_million;
        }),
      )) /
    1e6;
  if (tokenCapEstimate > config.max_cost_usd)
    throw new Error(
      `Judge output cap estimate $${tokenCapEstimate.toFixed(2)} exceeds configured budget`,
    );
  await mkdir(output, { recursive: true });
  const buckets = new Map<string, TokenBucket>();
  let spent = existing.reduce((sum, record) => sum + record.cost_usd, 0);
  const previousSpend = spent;
  let reserved = 0;
  const tasks: (() => Promise<void>)[] = [];
  for (const sample of responses) {
    if (
      sample.response.provider_error ||
      sample.response.filter_layer === 'api' ||
      isTruncated(sample.response)
    )
      continue;
    const item = manifest.items.find((i) => i.id === sample.item_id);
    const target = manifest.models.find((m) => m.key === sample.model_key);
    if (!item || !target)
      throw new Error(`Missing snapshot metadata for ${sample.sample_id}`);
    const pairs = [
      ...selectJudges(target, registry, config).map((model) => ({
        model,
        role: 'headline' as const,
      })),
      ...(sensitivity && sensitivity.family !== target.family
        ? [{ model: sensitivity, role: 'sensitivity' as const }]
        : []),
    ];
    const payload = {
      question: item.prompts[sample.lang],
      type: item.type,
      contested: item.contested,
      contested_note: item.contested_note,
      narrative_flags: item.narrative_flags,
      required_facts: item.required_facts,
      reference_answer: item.reference_answer,
      visible_response: sample.response.text,
    };
    for (const { model, role } of pairs) {
      const inputHash = hash({
        payload,
        promptHash,
        model,
        max_tokens: judgeTokenLimit(model, config),
      });
      const prior = existing.find(
        (j) =>
          j.sample_id === sample.sample_id &&
          j.judge_key === model.key &&
          j.role === role,
      );
      if (prior) {
        if (prior.input_hash !== inputHash)
          throw new Error(
            'Judge input or prompt changed; use a new run or archive the earlier judge artifact',
          );
        continue;
      }
      tasks.push(async () => {
        const provider = factory(model);
        const bucket =
          buckets.get(provider.cache_identity) ??
          new TokenBucket(config.requests_per_minute);
        buckets.set(provider.cache_identity, bucket);
        let result: JudgeRecord | undefined;
        let cost = 0;
        let fatalError: string | undefined;
        const price = prices[model.key]!;
        const requestEstimate =
          (Math.ceil(Buffer.byteLength(system + JSON.stringify(payload)) / 3) *
            price.input_per_million +
            judgeTokenLimit(model, config) * price.output_per_million) /
          1e6;
        for (let attempt = 1; attempt <= 2; attempt++) {
          if (spent + reserved + requestEstimate > config.max_cost_usd) {
            if (cost > 0) {
              await appendJsonl(
                file,
                JudgeRecordSchema.parse({
                  sample_id: sample.sample_id,
                  item_id: item.id,
                  model_key: target.key,
                  judge_key: model.key,
                  judge_family: model.family,
                  role,
                  prompt_hash: promptHash,
                  input_hash: inputHash,
                  created_at: new Date().toISOString(),
                  judge_error:
                    'Budget exhausted before retrying invalid verdict',
                  cost_usd: cost,
                  attempts: attempt - 1,
                }),
              );
            }
            await atomicJson(join(output, 'judge-interruption.json'), {
              reason: 'Judge budget exhausted',
              recorded_cost_usd: spent,
              sample_id: sample.sample_id,
              judge_key: model.key,
            });
            throw new Error(
              'Judge budget exhausted; partial artifacts preserved',
            );
          }
          reserved += requestEstimate;
          await bucket.take();
          let errorMessage: string | undefined;
          try {
            const generated = await provider.generate({
              model: model.endpoint.model,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: JSON.stringify(payload) },
              ],
              temperature: 0,
              max_tokens: judgeTokenLimit(model, config),
              reasoning: 'default',
              response_format: {
                type: 'json_schema',
                json_schema: { name: 'judge_verdict', strict: true, schema },
              },
              metadata: {
                item_id: item.id,
                lang: sample.lang,
                sample_idx: sample.sample_idx,
              },
            });
            const billed = responseCost(generated, model, prices);
            spent += billed;
            cost += billed;
            if (
              isTruncated(generated) ||
              generated.filter_layer === 'api' ||
              generated.provider_error
            )
              throw new Error('Judge returned no complete gradable verdict');
            const verdict = parseVerdict(
              generated.text,
              item,
              sample.response.text,
            );
            result = JudgeRecordSchema.parse({
              sample_id: sample.sample_id,
              item_id: item.id,
              model_key: target.key,
              judge_key: model.key,
              judge_family: model.family,
              role,
              prompt_hash: promptHash,
              input_hash: inputHash,
              created_at: new Date().toISOString(),
              verdict,
              cost_usd: cost,
              attempts: attempt,
            });
            break;
          } catch (error) {
            errorMessage =
              error instanceof Error
                ? error.message.slice(0, 300)
                : 'Judge error';
            if (
              error instanceof ProviderError &&
              [401, 402, 403, 404].includes(error.status)
            )
              fatalError = errorMessage;
          } finally {
            reserved -= requestEstimate;
          }
          if (attempt === 2 || fatalError) {
            result = JudgeRecordSchema.parse({
              sample_id: sample.sample_id,
              item_id: item.id,
              model_key: target.key,
              judge_key: model.key,
              judge_family: model.family,
              role,
              prompt_hash: promptHash,
              input_hash: inputHash,
              created_at: new Date().toISOString(),
              judge_error: errorMessage,
              cost_usd: cost,
              attempts: attempt,
            });
            break;
          }
        }
        if (!result) throw new Error('Judge did not record an outcome');
        await appendJsonl(file, result);
        existing.push(result);
        if (fatalError)
          throw new Error(
            `Judge stopped after ${fatalError}; partial artifacts preserved`,
          );
        if (existing.length % 25 === 0)
          log(
            `Judged ${existing.length} verdicts, new reported spend $${(spent - previousSpend).toFixed(4)}`,
          );
      });
    }
  }
  let next = 0;
  let failed = false;
  let failure: unknown;
  const concurrency = z
    .number()
    .int()
    .min(1)
    .max(16)
    .parse(options.concurrency ?? 1);
  async function worker() {
    while (!failed && !options.signal?.aborted) {
      const task = tasks[next++];
      if (!task) return;
      try {
        await task();
      } catch (error) {
        failed = true;
        failure ??= error;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (failed) throw failure;
  const queue = responses.flatMap((sample) => {
    const item = manifest.items.find((i) => i.id === sample.item_id)!;
    const pair = existing.filter(
      (j) => j.sample_id === sample.sample_id && j.role === 'headline',
    );
    const [a, b] = pair;
    return a?.verdict &&
      b?.verdict &&
      requiresReview(item, a.verdict, b.verdict)
      ? [
          {
            sample_id: sample.sample_id,
            item_id: item.id,
            response: sample.response.text,
            verdicts: pair,
          },
        ]
      : [];
  });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(
    join(output, 'needs_review.jsonl'),
    queue.map((q) => JSON.stringify(q)).join('\n') + (queue.length ? '\n' : ''),
    { mode: 0o600 },
  );
  await atomicJson(join(output, 'judge-summary.json'), {
    prompt_hash: promptHash,
    config,
    judge_models: allModels,
    verdicts: existing.length,
    interrupted: Boolean(options.signal?.aborted),
    concurrency,
    errors: existing.filter((j) => j.judge_error).length,
    needs_review: queue.length,
    cost_usd: existing.reduce((n, j) => n + j.cost_usd, 0),
  });
  await atomicJson(
    join(output, 'agreement.json'),
    agreementTables(existing, manifest.items),
  );
  return existing;
}
