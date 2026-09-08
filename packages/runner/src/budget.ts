import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  GenerateRequest,
  GenerateResponse,
  Prices,
} from '@ccp-bench/schema';
import { atomicJson, readJson } from './io';

const BudgetState = z.object({
  limit: z.number().nonnegative(),
  charged: z.number().nonnegative(),
  uncertain: z.number().nonnegative(),
  reservations: z.record(z.string(), z.number().nonnegative()),
});
export class BudgetExceeded extends Error {
  constructor() {
    super('Spending budget exhausted; unstarted calls remain resumable');
  }
}

/** One instance under the run's existing writer lock. Unknown charges stay reserved. */
export class SpendBudget {
  private queue: Promise<unknown> = Promise.resolve();
  private constructor(
    private path: string,
    private state: z.infer<typeof BudgetState>,
  ) {}
  static async open(path: string, limit: number, initialCharged = 0) {
    let state: z.infer<typeof BudgetState>;
    try {
      state = await readJson(path, BudgetState);
      if (state.limit !== limit)
        throw new Error('Persisted spending limit changed');
      // A crash may leave a provider request with an unknown billed outcome.
      state.uncertain += Object.values(state.reservations).reduce(
        (a, b) => a + b,
        0,
      );
      state.reservations = {};
      state.charged = Math.max(state.charged, initialCharged);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
      state = BudgetState.parse({
        limit,
        charged: initialCharged,
        uncertain: 0,
        reservations: {},
      });
    }
    await atomicJson(path, state);
    return new SpendBudget(path, state);
  }
  private update(change: () => void) {
    const next = this.queue.then(async () => {
      change();
      await atomicJson(this.path, this.state);
    });
    this.queue = next.catch(() => {});
    return next;
  }
  async generate(
    request: GenerateRequest,
    price: Prices[string],
    generate: () => Promise<GenerateResponse>,
  ) {
    // UTF-8 bytes conservatively bound input token count, including schema and chat overhead.
    const inputBound = Buffer.byteLength(JSON.stringify(request)) + 1024;
    const reserve =
      (inputBound * price.input_per_million +
        request.max_tokens * price.output_per_million) /
      1e6;
    const id = randomUUID();
    await this.update(() => {
      const used =
        this.state.charged +
        this.state.uncertain +
        Object.values(this.state.reservations).reduce((a, b) => a + b, 0);
      if (used + reserve > this.state.limit) throw new BudgetExceeded();
      this.state.reservations[id] = reserve;
    });
    let response: GenerateResponse;
    try {
      response = await generate();
    } catch (error) {
      await this.update(() => {
        this.state.uncertain += reserve;
        delete this.state.reservations[id];
      });
      throw error;
    }
    const cost =
      response.provider_cost ??
      (response.usage.input * price.input_per_million +
        response.usage.output * price.output_per_million) /
        1e6;
    if (!Number.isFinite(cost) || cost < 0)
      throw new Error('Invalid provider billing; reservation retained');
    await this.update(() => {
      this.state.charged += cost;
      delete this.state.reservations[id];
    });
    return response;
  }
}
