import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { SpendBudget, BudgetExceeded } from '../src/budget';
import type { GenerateRequest, GenerateResponse } from '@ccp-bench/schema';
const request: GenerateRequest = {
  model: 'fixture',
  messages: [{ role: 'user', content: 'test' }],
  max_tokens: 1000,
  reasoning: 'default',
  metadata: { item_id: 'fixture', lang: 'en', sample_idx: 0 },
};
const price = {
  input_per_million: 0,
  output_per_million: 1,
  source: 'fixture',
  checked_at: '2026-09-07T00:00:00Z',
};
const response: GenerateResponse = {
  text: 'answer',
  finish_reason: 'stop',
  usage: { input: 1, output: 1000 },
  latency_ms: 1,
  filter_layer: 'none',
};
it('reserves concurrent calls before sending and retains spent cost across restarts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'spend-budget-'));
  try {
    const path = join(dir, 'budget.json');
    const budget = await SpendBudget.open(path, 0.0015);
    let release!: () => void;
    const wait = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const first = budget.generate(request, price, async () => {
      calls++;
      await wait;
      return response;
    });
    await expect(
      budget.generate(request, price, async () => {
        calls++;
        return response;
      }),
    ).rejects.toBeInstanceOf(BudgetExceeded);
    release();
    await first;
    const resumed = await SpendBudget.open(path, 0.0015);
    await expect(
      resumed.generate(request, price, async () => {
        calls++;
        return response;
      }),
    ).rejects.toBeInstanceOf(BudgetExceeded);
    expect(calls).toBe(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it('does not free potentially billed failed calls for retries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'spend-uncertain-'));
  try {
    const path = join(dir, 'budget.json');
    const budget = await SpendBudget.open(path, 0.0015);
    await expect(
      budget.generate(request, price, async () => {
        throw new Error('timeout');
      }),
    ).rejects.toThrow('timeout');
    const resumed = await SpendBudget.open(path, 0.0015);
    await expect(
      resumed.generate(request, price, async () => response),
    ).rejects.toBeInstanceOf(BudgetExceeded);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
