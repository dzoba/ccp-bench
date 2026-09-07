import { z } from 'zod';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@ccp-bench/schema';
import { requestJson } from './http';
import type { Provider } from './types';

export class AnthropicProvider implements Provider {
  readonly id = 'anthropic';
  readonly cache_identity = 'anthropic:https://api.anthropic.com/v1';
  constructor(
    private readonly key: string,
    private readonly timeout = 180000,
  ) {}
  private headers() {
    return {
      'x-api-key': this.key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }
  async listModels(): Promise<string[]> {
    const models: string[] = [];
    let after = '';
    do {
      const raw = await requestJson(
        `https://api.anthropic.com/v1/models?limit=100${after ? `&after_id=${encodeURIComponent(after)}` : ''}`,
        { headers: this.headers() },
        this.timeout,
      );
      const page = z
        .object({
          data: z.array(z.object({ id: z.string() })),
          has_more: z.boolean(),
          last_id: z.string().nullable(),
        })
        .parse(raw);
      models.push(...page.data.map((m) => m.id));
      after = page.has_more ? (page.last_id ?? '') : '';
    } while (after);
    return models;
  }
  async generate(input: GenerateRequest): Promise<GenerateResponse> {
    const req = GenerateRequestSchema.parse(input);
    const started = performance.now();
    const raw = await requestJson(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.max_tokens,
          messages: req.messages.filter((m) => m.role !== 'system'),
          system:
            req.messages
              .filter((m) => m.role === 'system')
              .map((m) => m.content)
              .join('\n') || undefined,
          temperature: req.temperature,
          top_p: req.top_p,
          ...(req.reasoning === 'off'
            ? { thinking: { type: 'disabled' } }
            : req.reasoning === 'max'
              ? {
                  thinking: { type: 'adaptive' },
                  output_config: { effort: 'high' },
                }
              : {}),
          ...(req.response_format
            ? {
                output_config: {
                  ...(req.reasoning === 'max' ? { effort: 'high' } : {}),
                  format: {
                    type: 'json_schema',
                    schema:
                      req.response_format.json_schema &&
                      typeof req.response_format.json_schema === 'object' &&
                      'schema' in req.response_format.json_schema
                        ? req.response_format.json_schema.schema
                        : req.response_format,
                  },
                },
              }
            : {}),
        }),
      },
      this.timeout,
    );
    const parsed = z
      .object({
        content: z.array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
            thinking: z.string().optional(),
          }),
        ),
        stop_reason: z.string().nullable(),
        usage: z.object({
          input_tokens: z.number(),
          output_tokens: z.number(),
          cache_read_input_tokens: z.number().optional(),
          cache_creation_input_tokens: z.number().optional(),
        }),
      })
      .parse(raw);
    return GenerateResponseSchema.parse({
      text: parsed.content
        .filter((p) => p.type === 'text')
        .map((p) => p.text ?? '')
        .join('\n'),
      reasoning:
        parsed.content
          .filter((p) => p.type === 'thinking')
          .map((p) => p.thinking ?? '')
          .join('\n') || undefined,
      finish_reason: parsed.stop_reason ?? 'unknown',
      usage: {
        input:
          parsed.usage.input_tokens +
          (parsed.usage.cache_read_input_tokens ?? 0) +
          (parsed.usage.cache_creation_input_tokens ?? 0),
        output: parsed.usage.output_tokens,
      },
      latency_ms: performance.now() - started,
      filter_layer: 'none',
      raw,
    });
  }
}
