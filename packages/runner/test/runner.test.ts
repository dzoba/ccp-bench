import { mkdtemp, appendFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ModelSchema,
  RunConfigSchema,
  ResponseRecordSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@ccp-bench/schema';
import { loadBank } from '@ccp-bench/bank';
import { executeRun } from '../src/run';
import { readJsonl } from '../src/io';
import { requestHash, ResponseCache } from '../src/cache';
import { ProviderError, type Provider } from '../src/providers/types';
import { withRetries } from '../src/scheduler';
import { verifyModels } from '../src/providers';
import { samplingFor } from '../src/estimate';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const items = (await loadBank()).filter((i) =>
  ['tam-001', 'ncc-001'].includes(i.id),
);
const model = ModelSchema.parse({
  key: 'test',
  display: 'Test',
  vendor: 'Fixture',
  origin: 'us',
  weights: 'open',
  family: 'test',
  weights_id: 'test',
  host: 'local',
  endpoint: { provider: 'mock', model: 'test-model' },
  release_date: '2026-09-07',
});
const price = {
  test: {
    input_per_million: 1,
    output_per_million: 2,
    source: 'fixture',
    checked_at: '2026-09-07T00:00:00Z',
  },
};
const answer: GenerateResponse = {
  text: 'Visible answer',
  reasoning: 'Separate trace',
  finish_reason: 'stop',
  usage: { input: 10, output: 20 },
  latency_ms: 1,
  filter_layer: 'none',
};
const request: GenerateRequest = {
  model: 'test-model',
  messages: [{ role: 'user', content: 'A question?' }],
  max_tokens: 4096,
  reasoning: 'default',
  metadata: { item_id: 'tam-001', lang: 'en', sample_idx: 0 },
};
const provider: Provider = {
  id: 'mock',
  cache_identity: 'fixture-host',
  listModels: async () => ['test-model'],
  generate: async () => answer,
};
const config = RunConfigSchema.parse({
  run_id: 'test-run',
  models: ['test'],
  languages: ['en'],
  samples_per_item: 3,
  limits: { mock: { concurrency: 2, requests_per_minute: 600000 } },
});

describe('execution and resumption', () => {
  it('resumes an interrupted JSONL run without re-querying completed samples and keeps sampling draws independent', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ccp-run-test-'));
    directories.push(directory);
    let calls = 0;
    const factory = () => ({
      ...provider,
      generate: async (req: GenerateRequest) => {
        calls++;
        return { ...answer, text: `Draw ${req.metadata.sample_idx}` };
      },
    });
    const options = {
      directory,
      cacheDirectory: join(directory, 'cache'),
      providerFactory: factory,
      log: () => {},
    };
    const first = await executeRun(config, [model], items, price, {
      ...options,
      stopAfter: 2,
    });
    expect(first.status).toBe('interrupted');
    expect(first.totals.completed).toBe(2);
    expect(calls).toBe(2);
    await appendFile(
      join(directory, 'test-run/responses.jsonl'),
      '{"partial":',
    );
    const resumed = await executeRun(config, [model], items, price, options);
    expect(resumed.status).toBe('complete');
    expect(resumed.totals.completed).toBe(6);
    expect(calls).toBe(6);
    expect(resumed.totals.cost_usd).toBeCloseTo(0.0003);
    const records = await readJsonl(
      join(directory, 'test-run/responses.jsonl'),
      ResponseRecordSchema,
    );
    expect(new Set(records.map((r) => r.sample_id)).size).toBe(6);
    expect(new Set(records.map((r) => r.response.text)).size).toBe(3);
    await executeRun(config, [model], items, price, options);
    expect(calls).toBe(6);
    const cached = await executeRun(
      { ...config, run_id: 'cached-run' },
      [model],
      items,
      price,
      options,
    );
    expect(cached.totals.cached).toBe(6);
    expect(cached.totals.cost_usd).toBe(0);
    expect(calls).toBe(6);
    await executeRun(
      { ...config, run_id: 'fresh-run' },
      [model],
      items,
      price,
      { ...options, noCache: true },
    );
    expect(calls).toBe(12);
    await expect(
      executeRun(
        { ...config, sampling: { temperature: 1 } },
        [model],
        items,
        price,
        options,
      ),
    ).rejects.toThrow('changed');
  });
  it('records exhausted provider failures per sample without dropping work', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ccp-errors-'));
    directories.push(directory);
    let calls = 0;
    const failed = await executeRun(
      { ...config, samples_per_item: 1, retries: 1, retry_base_ms: 1 },
      [model],
      items,
      price,
      {
        directory,
        cacheDirectory: join(directory, 'cache'),
        providerFactory: () => ({
          ...provider,
          generate: async () => {
            calls++;
            throw new ProviderError('Overloaded', 503);
          },
        }),
        log: () => {},
      },
    );
    expect(calls).toBe(4);
    expect(failed.totals.failed).toBe(2);
    expect(failed.totals.completed).toBe(2);
    const records = await readJsonl(
      join(directory, 'test-run/responses.jsonl'),
      ResponseRecordSchema,
    );
    expect(
      records.every(
        (r) => r.attempts === 2 && r.response.filter_layer === 'unknown',
      ),
    ).toBe(true);
  });
  it('preserves API filters separately from provider errors and textual refusals', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ccp-filter-'));
    directories.push(directory);
    const run = await executeRun(
      { ...config, samples_per_item: 1 },
      [model],
      items,
      price,
      {
        directory,
        cacheDirectory: join(directory, 'cache'),
        providerFactory: () => ({
          ...provider,
          generate: async () => {
            throw new ProviderError('Filtered', 400, undefined, true);
          },
        }),
        log: () => {},
      },
    );
    expect(run.totals.filtered).toBe(2);
    expect(run.totals.failed).toBe(0);
    expect(
      await readFile(join(directory, 'test-run/responses.jsonl'), 'utf8'),
    ).toContain('content_filter');
  });
});
describe('cache and retry policy', () => {
  it('preserves model-recommended token and reasoning settings when only temperature is overridden', () => {
    const configured = RunConfigSchema.parse({
      models: ['test'],
      sampling: { temperature: 0 },
    });
    expect(
      samplingFor(
        {
          ...model,
          recommended: { max_tokens: 8192, reasoning: 'max', top_p: 0.9 },
        },
        configured,
      ),
    ).toEqual({
      max_tokens: 8192,
      reasoning: 'max',
      top_p: 0.9,
      temperature: 0,
    });
  });
  it('keys by host, model, parameters and messages, with independent draw slots', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ccp-cache-'));
    directories.push(directory);
    const cache = new ResponseCache(directory);
    const key = requestHash(provider, request);
    expect(requestHash(provider, { ...request, temperature: 1 })).not.toBe(key);
    expect(
      requestHash({ ...provider, cache_identity: 'another-host' }, request),
    ).not.toBe(key);
    expect(
      requestHash(provider, { ...request, model: 'another-model' }),
    ).not.toBe(key);
    expect(
      requestHash(provider, {
        ...request,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...request.messages,
        ],
      }),
    ).not.toBe(key);
    await cache.put(key, 0, answer, 0.1);
    expect((await cache.get(key, 0))?.generation_cost_usd).toBe(0.1);
    expect(await cache.get(key, 1)).toBeUndefined();
  });
  it('retries 429 and 5xx with a cap, but never retries authentication or filters', async () => {
    let calls = 0;
    await expect(
      withRetries(
        async () => {
          calls++;
          throw new ProviderError('Limited', 429);
        },
        { retries: 2, baseMs: 1 },
      ),
    ).rejects.toThrow('Limited');
    expect(calls).toBe(3);
    calls = 0;
    await expect(
      withRetries(
        async () => {
          calls++;
          throw new ProviderError('Auth', 401);
        },
        { retries: 2, baseMs: 1 },
      ),
    ).rejects.toThrow('Auth');
    expect(calls).toBe(1);
  });
  it('fails loudly with the live catalog when a model is absent', async () => {
    await expect(
      verifyModels(
        [{ ...model, endpoint: { ...model.endpoint, model: 'invented' } }],
        () => provider,
      ),
    ).rejects.toThrow('Current models:\ntest-model');
  });
});

it('stops a budget-limited workload without recording unstarted calls as provider errors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'runner-budget-'));
  directories.push(directory);
  let calls = 0;
  const paidProvider: Provider = {
    ...provider,
    generate: async () => {
      calls++;
      return { ...answer, provider_cost: 0.001 };
    },
  };
  const capped = RunConfigSchema.parse({
    ...config,
    run_id: 'capped',
    samples_per_item: 1,
    sampling: { max_tokens: 1000 },
    max_cost_usd: 0.0015,
  });
  const prices = {
    test: { ...price.test, input_per_million: 0, output_per_million: 1 },
  };
  const options = {
    directory,
    cacheDirectory: join(directory, 'cache'),
    budgetLimited: true,
    providerFactory: () => paidProvider,
    log: () => {},
  };
  const partial = await executeRun(capped, [model], items, prices, options);
  expect(partial.status).toBe('interrupted');
  expect(partial.totals.completed).toBe(1);
  expect(partial.totals.failed).toBe(0);
  expect(calls).toBe(1);
  await executeRun(capped, [model], items, prices, options);
  expect(calls).toBe(1);
});

it('records a concurrency override without changing sampling or the run configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'runner-concurrency-'));
  directories.push(directory);
  let active = 0,
    peak = 0;
  const parallel: Provider = {
    ...provider,
    generate: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active--;
      return answer;
    },
  };
  const one = RunConfigSchema.parse({
    ...config,
    run_id: 'override',
    samples_per_item: 1,
    limits: { mock: { concurrency: 1, requests_per_minute: 600000 } },
  });
  const result = await executeRun(one, [model], items, price, {
    directory,
    cacheDirectory: join(directory, 'cache'),
    providerFactory: () => parallel,
    concurrency: 2,
    log: () => {},
  });
  expect(peak).toBe(2);
  expect(result.config.limits.mock?.concurrency).toBe(1);
  expect(result.totals.completed).toBe(2);
  expect(
    await readFile(join(directory, 'override/execution-events.jsonl'), 'utf8'),
  ).toContain('"concurrency_override":2');
});
