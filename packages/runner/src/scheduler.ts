import { setTimeout as sleep } from 'node:timers/promises';
import { ProviderError } from './providers/types';

export class TokenBucket {
  private tokens: number;
  private updated = Date.now();
  constructor(
    private readonly perMinute: number,
    private readonly capacity = 1,
  ) {
    this.tokens = capacity;
  }
  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(
        this.capacity,
        this.tokens + ((now - this.updated) * this.perMinute) / 60000,
      );
      this.updated = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await sleep(Math.ceil(((1 - this.tokens) * 60000) / this.perMinute));
    }
  }
}
export async function withRetries<T>(
  work: () => Promise<T>,
  options: {
    retries: number;
    baseMs: number;
    beforeAttempt?: () => Promise<void>;
    onAttempt?: () => void;
  },
): Promise<{ value: T; attempts: number }> {
  for (let attempt = 0; ; attempt++) {
    await options.beforeAttempt?.();
    options.onAttempt?.();
    try {
      return { value: await work(), attempts: attempt + 1 };
    } catch (error) {
      const retriable =
        error instanceof ProviderError
          ? !error.filtered && (error.status === 429 || error.status >= 500)
          : error instanceof TypeError ||
            (error instanceof Error &&
              ['TimeoutError', 'AbortError'].includes(error.name));
      if (!retriable || attempt >= options.retries) throw error;
      const hinted =
        error instanceof ProviderError ? error.retry_after_ms : undefined;
      await sleep(
        Math.min(60000, Math.max(hinted ?? 0, options.baseMs * 2 ** attempt)),
      );
    }
  }
}
