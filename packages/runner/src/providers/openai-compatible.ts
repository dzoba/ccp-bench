import { z } from 'zod';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@ccp-bench/schema';
import { requestJson } from './http';
import { ProviderError, type Provider } from './types';

const wireSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          reasoning: z.string().nullable().optional(),
          reasoning_content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
        finish_reason: z.string().nullable(),
      }),
    )
    .optional(),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      completion_tokens_details: z
        .object({ reasoning_tokens: z.number().optional() })
        .optional(),
      cost: z.number().optional(),
    })
    .optional(),
  error: z
    .object({
      message: z.string(),
      code: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});
export class OpenAICompatibleProvider implements Provider {
  readonly cache_identity: string;
  constructor(
    readonly id: string,
    readonly baseUrl: string,
    private readonly key: string,
    private readonly timeout = 180000,
  ) {
    const url = new URL(baseUrl);
    if (url.username || url.password || url.search)
      throw new Error(
        'Provider base URLs cannot contain credentials or query strings',
      );
    this.cache_identity = `${id}:${baseUrl.replace(/\/$/, '')}`;
  }
  async listModels(): Promise<string[]> {
    const payload = await requestJson(
      `${this.baseUrl}/models`,
      { headers: this.headers() },
      this.timeout,
    );
    return z
      .object({ data: z.array(z.object({ id: z.string() })) })
      .parse(payload)
      .data.map((m) => m.id);
  }
  private headers() {
    return {
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
    };
  }
  async generate(input: GenerateRequest): Promise<GenerateResponse> {
    const req = GenerateRequestSchema.parse(input);
    const started = performance.now();
    const reasoning: Record<string, unknown> =
      req.reasoning === 'default'
        ? {}
        : this.id === 'openrouter'
          ? { reasoning: { effort: req.reasoning === 'off' ? 'none' : 'high' } }
          : ['deepseek', 'moonshot', 'zhipu'].includes(this.id)
            ? {
                thinking: {
                  type: req.reasoning === 'off' ? 'disabled' : 'enabled',
                },
              }
            : { reasoning_effort: req.reasoning === 'off' ? 'none' : 'high' };
    const raw = await requestJson(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          temperature: req.temperature,
          top_p: req.top_p,
          max_tokens: req.max_tokens,
          response_format: req.response_format,
          ...reasoning,
        }),
      },
      this.timeout,
    );
    const parsed = wireSchema.parse(raw);
    if (parsed.error) {
      const code = Number(parsed.error.code) || 500;
      throw new ProviderError(
        `Provider error ${code}`,
        code,
        undefined,
        /content[_ -]?filter|safety|moderation/i.test(parsed.error.message),
      );
    }
    const choice = parsed.choices?.[0];
    if (!choice) throw new ProviderError('No completion returned', 502);
    const filtered = choice.finish_reason === 'content_filter';
    if (!parsed.usage && !filtered)
      throw new ProviderError('Missing usage accounting', 502);
    return GenerateResponseSchema.parse({
      text: choice.message.content ?? choice.message.refusal ?? '',
      reasoning:
        choice.message.reasoning ??
        choice.message.reasoning_content ??
        undefined,
      finish_reason: choice.finish_reason ?? 'unknown',
      usage: {
        input: parsed.usage?.prompt_tokens ?? 0,
        output: parsed.usage?.completion_tokens ?? 0,
        reasoning: parsed.usage?.completion_tokens_details?.reasoning_tokens,
      },
      latency_ms: performance.now() - started,
      filter_layer: filtered ? 'api' : 'none',
      provider_cost: parsed.usage?.cost,
      raw,
    });
  }
}
