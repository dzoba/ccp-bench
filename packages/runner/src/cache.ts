import { join } from 'node:path';
import { z } from 'zod';
import {
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@ccp-bench/schema';
import { atomicJson, hash, readJson } from './io';
import type { Provider } from './providers/types';

const CacheEntrySchema = z.strictObject({
  request_hash: z.string(),
  draw: z.number().int().nonnegative(),
  response: GenerateResponseSchema,
  generation_cost_usd: z.number().nonnegative(),
  created_at: z.iso.datetime(),
});
export function requestHash(
  provider: Pick<Provider, 'id' | 'cache_identity'>,
  req: GenerateRequest,
): string {
  return hash({
    provider: provider.id,
    endpoint: provider.cache_identity,
    model: req.model,
    messages: req.messages,
    temperature: req.temperature,
    top_p: req.top_p,
    max_tokens: req.max_tokens,
    reasoning: req.reasoning,
    response_format: req.response_format,
  });
}
export class ResponseCache {
  constructor(private readonly directory: string) {}
  private path(key: string, draw: number) {
    return join(this.directory, key.slice(0, 2), `${key}-${draw}.json`);
  }
  async get(key: string, draw: number) {
    try {
      const entry = await readJson(this.path(key, draw), CacheEntrySchema);
      if (entry.request_hash !== key || entry.draw !== draw)
        throw new Error('Cache identity mismatch');
      return entry;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return undefined;
      throw error;
    }
  }
  async put(
    key: string,
    draw: number,
    response: GenerateResponse,
    cost: number,
  ) {
    await atomicJson(
      this.path(key, draw),
      CacheEntrySchema.parse({
        request_hash: key,
        draw,
        response,
        generation_cost_usd: cost,
        created_at: new Date().toISOString(),
      }),
    );
  }
}
