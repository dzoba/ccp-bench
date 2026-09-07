import { join } from 'node:path';
import { z } from 'zod';
import {
  GenerateResponseSchema,
  type GenerateRequest,
  type Model,
  type Prices,
} from '@ccp-bench/schema';
import { createProvider } from '../providers';
import { responseCost } from '../estimate';
import { readJson, atomicJson, hash } from '../io';
import { requestJson } from '../providers/http';
import { isTruncated } from '../providers/types';
import { TokenBucket, withRetries } from '../scheduler';
import { centroid } from './math';
export class DiscoveryClient {
  private spend = 0;
  private limiter = new TokenBucket(30);
  private embeddingPrice = 0;
  constructor(
    private directory: string,
    private prices: Prices,
    readonly maxCost: number,
    readonly embeddingModel: string,
  ) {}
  async initialize() {
    const ledger = await this.cached(
      'spend',
      z.object({ cost: z.number().nonnegative() }),
    );
    this.spend = ledger?.cost ?? 0;
    const list = z
      .object({
        data: z.array(
          z.object({
            id: z.string(),
            pricing: z.object({ prompt: z.coerce.number().nonnegative() }),
          }),
        ),
      })
      .parse(
        await requestJson(
          'https://openrouter.ai/api/v1/embeddings/models',
          {},
          60000,
        ),
      );
    const model = list.data.find((m) => m.id === this.embeddingModel);
    if (!model)
      throw new Error('Embedding model unavailable: ' + this.embeddingModel);
    this.embeddingPrice = model.pricing.prompt;
    await atomicJson(join(this.directory, 'embedding-model.json'), {
      ...model,
      checked_at: new Date().toISOString(),
    });
  }
  get cost() {
    return this.spend;
  }
  private async cached<T>(
    key: string,
    schema: z.ZodType<T>,
  ): Promise<T | undefined> {
    try {
      return await readJson(join(this.directory, key + '.json'), schema);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
  }
  private async record(cost: number) {
    this.spend += cost;
    await atomicJson(join(this.directory, 'spend.json'), { cost: this.spend });
  }
  private reserve(maximum: number) {
    if (this.spend + maximum > this.maxCost)
      throw new Error(
        `Discovery would exceed $${this.maxCost} budget; progress is saved`,
      );
  }
  async chat(model: Model, request: GenerateRequest) {
    const key = 'chat-' + hash({ model, request });
    const previous = await this.cached(key, GenerateResponseSchema);
    if (previous) return previous;
    const price = this.prices[model.key];
    if (!price) throw new Error('Missing discovery price');
    const maximum =
      ((Buffer.byteLength(JSON.stringify(request.messages)) / 3 + 100) *
        price.input_per_million +
        request.max_tokens * price.output_per_million) /
      1e6;
    this.reserve(maximum);
    await this.limiter.take();
    const { value: response } = await withRetries(
      () => createProvider(model).generate(request),
      { retries: 2, baseMs: 1000 },
    );
    await this.record(responseCost(response, model, this.prices));
    await atomicJson(join(this.directory, key + '.json'), response);
    return response;
  }
  async json<T>(
    model: Model,
    system: string,
    payload: unknown,
    schema: z.ZodType<T>,
    maxTokens = 4096,
  ) {
    const response = await this.chat(model, {
      model: model.endpoint.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      max_tokens: maxTokens,
      temperature: 0,
      reasoning: 'off',
      metadata: {
        item_id: 'discovery-' + hash(payload).slice(0, 12),
        lang: 'en',
        sample_idx: 0,
      },
    });
    if (
      isTruncated(response) ||
      response.filter_layer === 'api' ||
      response.provider_error
    )
      throw new Error('Incomplete structured discovery response');
    return schema.parse(
      JSON.parse(response.text.replace(/^```(?:json)?\s*|\s*```$/g, '')),
    );
  }
  async embed(text: string): Promise<number[]> {
    return (await this.embedMany([text]))[0]!;
  }
  async embedMany(texts: string[]): Promise<number[][]> {
    const groups = texts.map((text) =>
      Array.from(
        { length: Math.max(1, Math.ceil(text.length / 4000)) },
        (_, i) => text.slice(i * 4000, (i + 1) * 4000),
      ),
    );
    const keys = groups.map((chunks) =>
      chunks.map(
        (text) => 'embedding-' + hash({ model: this.embeddingModel, text }),
      ),
    );
    const values = new Map<string, number[]>();
    const missing = new Map<string, string>();
    for (let i = 0; i < groups.length; i++)
      for (let j = 0; j < groups[i]!.length; j++) {
        const key = keys[i]![j]!;
        if (values.has(key) || missing.has(key)) continue;
        const cached = await this.cached(
          key,
          z.array(z.number().finite()).min(1),
        );
        if (cached) values.set(key, cached);
        else missing.set(key, groups[i]![j]!);
      }
    const pending = [...missing];
    for (let offset = 0; offset < pending.length; offset += 64) {
      const batch = pending.slice(offset, offset + 64);
      this.reserve(
        batch.reduce((n, [, text]) => n + Buffer.byteLength(text) + 100, 0) *
          this.embeddingPrice,
      );
      await this.limiter.take();
      const wire = z
        .object({
          data: z.array(
            z.object({
              index: z.number().int().nonnegative(),
              embedding: z.array(z.number().finite()).min(1),
            }),
          ),
          usage: z.object({
            prompt_tokens: z.number().nonnegative(),
            cost: z.number().nonnegative().optional(),
          }),
        })
        .parse(
          (
            await withRetries(
              () =>
                requestJson(
                  'https://openrouter.ai/api/v1/embeddings',
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: this.embeddingModel,
                      input: batch.map(([, text]) => text),
                      encoding_format: 'float',
                    }),
                  },
                  60000,
                ),
              { retries: 2, baseMs: 1000 },
            )
          ).value,
        );
      await this.record(
        wire.usage.cost ?? wire.usage.prompt_tokens * this.embeddingPrice,
      );
      const rows = wire.data.sort((a, b) => a.index - b.index);
      if (rows.length !== batch.length || rows.some((r, i) => r.index !== i))
        throw new Error('Embedding batch indexes mismatch');
      for (const row of rows) {
        const key = batch[row.index]![0];
        await atomicJson(join(this.directory, key + '.json'), row.embedding);
        values.set(key, row.embedding);
      }
    }
    return keys.map((chunks) =>
      centroid(chunks.map((key) => values.get(key)!)),
    );
  }
}
