import { mkdir, open, rm } from 'node:fs/promises';
import { hostname } from 'node:os';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  GenerateResponseSchema,
  ManifestSchema,
  ProviderLimitSchema,
  ResponseRecordSchema,
  type GenerateRequest,
  type Item,
  type Manifest,
  type Model,
  type Prices,
  type ResponseRecord,
  type RunConfig,
} from '@ccp-bench/schema';
import { atomicJson, appendJsonl, hash, readJson, readJsonl, root } from './io';
import { ResponseCache, requestHash } from './cache';
import { createProvider, verifyModels } from './providers';
import { ProviderError, isTruncated, type Provider } from './providers/types';
import { TokenBucket, withRetries } from './scheduler';
import { estimateRun, responseCost, samplingFor } from './estimate';
import { BudgetExceeded, SpendBudget } from './budget';

async function settleWorkers(tasks: Promise<unknown>[]): Promise<void> {
  const results = await Promise.allSettled(tasks);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed?.status === 'rejected') throw failed.reason;
}

export type RunOptions = {
  directory?: string;
  cacheDirectory?: string;
  noCache?: boolean;
  budgetLimited?: boolean;
  concurrency?: number;
  stopAfter?: number;
  signal?: AbortSignal;
  providerFactory?: (model: Model, timeout?: number) => Provider;
  log?: (line: string) => void;
};
export async function executeRun(
  config: RunConfig,
  models: Model[],
  items: Item[],
  prices: Prices,
  options: RunOptions = {},
): Promise<Manifest> {
  const identity = hash({ config, models, items, prices });
  const runId = config.run_id ?? `run-${identity.slice(0, 16)}`;
  const directory = join(options.directory ?? join(root, 'runs'), runId);
  const cache = new ResponseCache(
    options.cacheDirectory ?? join(root, '.cache/responses'),
  );
  const factory = options.providerFactory ?? createProvider;
  const estimate = estimateRun(config, models, items, prices);
  if (
    !options.budgetLimited &&
    config.max_cost_usd !== undefined &&
    estimate.token_cap_estimate_usd > config.max_cost_usd
  )
    throw new Error(
      `Estimated token-cap cost $${estimate.token_cap_estimate_usd.toFixed(4)} exceeds configured budget $${config.max_cost_usd}`,
    );
  if (options.budgetLimited && config.max_cost_usd === undefined)
    throw new Error('Budget-limited runs require max_cost_usd');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = join(directory, 'writer.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    throw new Error(
      `Run ${runId} has a writer lock. Verify the recorded PID is no longer running before using bench unlock.`,
      { cause: error },
    );
  }
  await lock.writeFile(
    JSON.stringify({
      pid: process.pid,
      hostname: hostname(),
      started_at: new Date().toISOString(),
    }),
  );
  const log = options.log ?? console.log;
  try {
    const now = new Date().toISOString();
    let manifest: Manifest;
    try {
      manifest = await readJson(
        join(directory, 'manifest.json'),
        ManifestSchema,
      );
      if (manifest.identity_hash !== identity)
        throw new Error(
          `Run ${runId} configuration, bank, registry, or price snapshot changed; choose a new run_id`,
        );
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
      let gitSha = 'unknown';
      let gitDirty = true;
      try {
        gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {
          cwd: root,
          encoding: 'utf8',
        }).trim();
        gitDirty = Boolean(
          execFileSync('git', ['status', '--porcelain'], {
            cwd: root,
            encoding: 'utf8',
          }).trim(),
        );
      } catch {
        /* A source tarball may not include Git metadata. */
      }
      manifest = ManifestSchema.parse({
        run_id: runId,
        bench_version: config.bench_version,
        identity_hash: identity,
        git_sha: gitSha,
        git_dirty: gitDirty,
        started_at: now,
        updated_at: now,
        status: 'running',
        config,
        models,
        items,
        prices,
        totals: {
          planned: estimate.calls,
          completed: 0,
          failed: 0,
          filtered: 0,
          truncated: 0,
          cached: 0,
          cost_usd: 0,
          input_tokens: 0,
          output_tokens: 0,
        },
      });
    }
    const records = await readJsonl(
      join(directory, 'responses.jsonl'),
      ResponseRecordSchema,
      true,
    );
    const existing = new Set(records.map((record) => record.sample_id));
    if (existing.size !== records.length)
      throw new Error('Duplicate sample records in run artifact');
    const tasks = models.flatMap((model) =>
      items.flatMap((item) =>
        config.languages.flatMap((lang) =>
          item.prompts[lang]
            ? Array.from(
                { length: config.samples_per_item },
                (_, sample_idx) => ({
                  model,
                  item,
                  lang,
                  sample_idx,
                  sample_id: `${model.key}:${item.id}:${lang}:${sample_idx}`,
                }),
              )
            : [],
        ),
      ),
    );
    const taskMap = new Map(tasks.map((task) => [task.sample_id, task]));
    for (const record of records) {
      const task = taskMap.get(record.sample_id);
      if (
        !task ||
        task.item.version !== record.item_version ||
        task.item.id !== record.item_id ||
        task.lang !== record.lang ||
        task.model.key !== record.model_key ||
        task.sample_idx !== record.sample_idx
      )
        throw new Error(`Unexpected response record ${record.sample_id}`);
    }
    function totals() {
      manifest.totals = {
        planned: tasks.length,
        completed: records.length,
        failed: records.filter((r) => r.response.provider_error).length,
        filtered: records.filter((r) => r.response.filter_layer === 'api')
          .length,
        truncated: records.filter((r) => isTruncated(r.response)).length,
        cached: records.filter((r) => r.cached).length,
        cost_usd: records.reduce((n, r) => n + r.cost_usd, 0),
        input_tokens: records.reduce((n, r) => n + r.response.usage.input, 0),
        output_tokens: records.reduce((n, r) => n + r.response.usage.output, 0),
        billing_uncertain_samples: records.filter(
          (r) =>
            r.billing_uncertain || r.response.provider_error || r.attempts > 1,
        ).length,
      };
      manifest.updated_at = new Date().toISOString();
    }
    totals();
    const pending = tasks.filter((task) => !existing.has(task.sample_id));
    await verifyModels(models, (model) => factory(model, config.timeout_ms));
    if (pending.length === 0) {
      manifest.status = 'complete';
      await atomicJson(join(directory, 'manifest.json'), manifest);
      log(
        `${runId}: already complete, ${records.length} recorded samples, $${manifest.totals.cost_usd.toFixed(4)}`,
      );
      return manifest;
    }
    const budget =
      config.max_cost_usd === undefined
        ? undefined
        : await SpendBudget.open(
            join(directory, 'spend-budget.json'),
            config.max_cost_usd,
            manifest.totals.cost_usd,
          );
    let executionSha = 'unknown';
    try {
      executionSha = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
    } catch {
      /* Source archives may omit Git. */
    }
    await appendJsonl(join(directory, 'execution-events.jsonl'), {
      started_at: new Date().toISOString(),
      git_sha: executionSha,
      budget_limited: options.budgetLimited ?? false,
      concurrency_override: options.concurrency ?? null,
    });
    let budgetStopped = false;
    manifest.status = 'running';
    await atomicJson(join(directory, 'manifest.json'), manifest);
    const groups = new Map<
      string,
      { provider: Provider; tasks: typeof pending }
    >();
    for (const task of pending) {
      const provider = factory(task.model, config.timeout_ms);
      const group = groups.get(provider.cache_identity) ?? {
        provider,
        tasks: [],
      };
      group.tasks.push(task);
      groups.set(provider.cache_identity, group);
    }
    let scheduled = 0;
    let completedNow = 0;
    let writeQueue = Promise.resolve();
    const startTime = Date.now();
    await settleWorkers(
      [...groups.values()].map(async ({ provider, tasks: groupTasks }) => {
        const limit = ProviderLimitSchema.parse({
          ...config.limits[provider.id],
          ...(options.concurrency === undefined
            ? {}
            : { concurrency: options.concurrency }),
        });
        const bucket = new TokenBucket(
          limit.requests_per_minute,
          limit.concurrency,
        );
        let cursor = 0;
        await settleWorkers(
          Array.from({ length: limit.concurrency }, async () => {
            while (
              cursor < groupTasks.length &&
              !budgetStopped &&
              !options.signal?.aborted &&
              (options.stopAfter === undefined || scheduled < options.stopAfter)
            ) {
              const task = groupTasks[cursor++]!;
              scheduled++;
              const req: GenerateRequest = {
                model: task.model.endpoint.model,
                messages: [
                  ...(config.system_prompt
                    ? [
                        {
                          role: 'system' as const,
                          content: config.system_prompt,
                        },
                      ]
                    : []),
                  { role: 'user', content: task.item.prompts[task.lang]! },
                ],
                ...samplingFor(task.model, config),
                metadata: {
                  item_id: task.item.id,
                  lang: task.lang,
                  sample_idx: task.sample_idx,
                },
              };
              const key = requestHash(provider, req);
              let response: ResponseRecord['response'];
              let billed = 0,
                generatedCost = 0,
                attempts = 0,
                cached = false;
              const hit = options.noCache
                ? undefined
                : await cache.get(key, task.sample_idx);
              if (hit) {
                response = hit.response;
                generatedCost = hit.generation_cost_usd;
                cached = true;
              } else {
                try {
                  const result = await withRetries(
                    () =>
                      budget
                        ? budget.generate(req, prices[task.model.key]!, () =>
                            provider.generate(req),
                          )
                        : provider.generate(req),
                    {
                      retries: config.retries,
                      baseMs: config.retry_base_ms,
                      beforeAttempt: () => bucket.take(),
                      onAttempt: () => {
                        attempts++;
                      },
                    },
                  );
                  response = GenerateResponseSchema.parse(result.value);
                  billed = generatedCost = responseCost(
                    response,
                    task.model,
                    prices,
                  );
                } catch (error) {
                  if (error instanceof BudgetExceeded) {
                    budgetStopped = true;
                    break;
                  }
                  const filtered =
                    error instanceof ProviderError && error.filtered;
                  response = {
                    text: '',
                    finish_reason: filtered ? 'content_filter' : 'error',
                    usage: { input: 0, output: 0 },
                    latency_ms: 0,
                    filter_layer: filtered ? 'api' : 'unknown',
                    raw: error instanceof ProviderError ? error.raw : undefined,
                    ...(filtered
                      ? {}
                      : {
                          provider_error:
                            error instanceof ProviderError
                              ? error.message
                              : error instanceof Error
                                ? error.name
                                : 'Unknown error',
                        }),
                  };
                }
              }
              const record = ResponseRecordSchema.parse({
                sample_id: task.sample_id,
                item_id: task.item.id,
                item_version: task.item.version,
                split: task.item.split,
                model_key: task.model.key,
                lang: task.lang,
                sample_idx: task.sample_idx,
                request_hash: key,
                response,
                cached,
                cost_usd: billed,
                generation_cost_usd: generatedCost,
                attempts,
                billing_uncertain:
                  Boolean(response.provider_error) || attempts > 1,
                created_at: new Date().toISOString(),
              });
              writeQueue = writeQueue.then(async () => {
                await appendJsonl(join(directory, 'responses.jsonl'), record);
                records.push(record);
                if (!cached && !options.noCache && !response.provider_error) {
                  try {
                    await cache.put(
                      key,
                      task.sample_idx,
                      response,
                      generatedCost,
                    );
                  } catch {
                    log(
                      'Cache write failed; the response remains durably recorded in the run.',
                    );
                  }
                }
                completedNow++;
                totals();
                await atomicJson(join(directory, 'manifest.json'), manifest);
                if (records.length % 25 === 0) {
                  const remaining = tasks.length - records.length;
                  const eta = Math.ceil(
                    (((Date.now() - startTime) / Math.max(1, completedNow)) *
                      remaining) /
                      1000,
                  );
                  log(
                    `${runId}: ${records.length}/${tasks.length}, ETA ${eta}s, reported spend $${manifest.totals.cost_usd.toFixed(4)}`,
                  );
                }
              });
              await writeQueue;
            }
          }),
        );
      }),
    );
    await writeQueue;
    manifest.status =
      records.length === tasks.length ? 'complete' : 'interrupted';
    totals();
    await atomicJson(join(directory, 'manifest.json'), manifest);
    log(
      `${runId}: ${manifest.status}, ${records.length}/${tasks.length}, ${manifest.totals.failed} errors, ${manifest.totals.filtered} API filters, reported spend $${manifest.totals.cost_usd.toFixed(4)}`,
    );
    return manifest;
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
