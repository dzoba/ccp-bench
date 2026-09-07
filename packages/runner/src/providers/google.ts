import { z } from 'zod';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  type GenerateRequest,
  type GenerateResponse,
} from '@ccp-bench/schema';
import { requestJson } from './http';
import { ProviderError, type Provider } from './types';

export class GoogleProvider implements Provider {
  readonly id = 'google';
  readonly cache_identity =
    'google:https://generativelanguage.googleapis.com/v1beta';
  constructor(
    private readonly key: string,
    private readonly timeout = 180000,
  ) {}
  private headers() {
    return { 'x-goog-api-key': this.key, 'Content-Type': 'application/json' };
  }
  async listModels(): Promise<string[]> {
    const models: string[] = [];
    let token = '';
    do {
      const raw = await requestJson(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`,
        { headers: this.headers() },
        this.timeout,
      );
      const page = z
        .object({
          models: z.array(
            z.object({
              name: z.string(),
              supportedGenerationMethods: z.array(z.string()).optional(),
            }),
          ),
          nextPageToken: z.string().optional(),
        })
        .parse(raw);
      models.push(
        ...page.models
          .filter((m) =>
            m.supportedGenerationMethods?.includes('generateContent'),
          )
          .map((m) => m.name.replace(/^models\//, '')),
      );
      token = page.nextPageToken ?? '';
    } while (token);
    return models;
  }
  async generate(input: GenerateRequest): Promise<GenerateResponse> {
    const req = GenerateRequestSchema.parse(input);
    const started = performance.now();
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => ({ text: m.content }));
    const raw = await requestJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model.replace(/^models\//, ''))}:generateContent`,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          contents: req.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          systemInstruction: system.length ? { parts: system } : undefined,
          generationConfig: {
            temperature: req.temperature,
            topP: req.top_p,
            maxOutputTokens: req.max_tokens,
            ...(req.reasoning === 'default'
              ? {}
              : {
                  thinkingConfig: req.model.startsWith('gemini-3')
                    ? {
                        thinkingLevel:
                          req.reasoning === 'off' ? 'minimal' : 'high',
                        includeThoughts: true,
                      }
                    : {
                        thinkingBudget: req.reasoning === 'off' ? 0 : -1,
                        includeThoughts: true,
                      },
                }),
            ...(req.response_format
              ? {
                  responseMimeType: 'application/json',
                  responseJsonSchema:
                    req.response_format.json_schema &&
                    typeof req.response_format.json_schema === 'object' &&
                    'schema' in req.response_format.json_schema
                      ? req.response_format.json_schema.schema
                      : req.response_format,
                }
              : {}),
          },
        }),
      },
      this.timeout,
    );
    const parsed = z
      .object({
        candidates: z
          .array(
            z.object({
              content: z
                .object({
                  parts: z.array(
                    z.object({
                      text: z.string().optional(),
                      thought: z.boolean().optional(),
                    }),
                  ),
                })
                .optional(),
              finishReason: z.string().optional(),
            }),
          )
          .optional(),
        promptFeedback: z
          .object({ blockReason: z.string().optional() })
          .optional(),
        usageMetadata: z
          .object({
            promptTokenCount: z.number().optional(),
            candidatesTokenCount: z.number().optional(),
            thoughtsTokenCount: z.number().optional(),
          })
          .optional(),
      })
      .parse(raw);
    const candidate = parsed.candidates?.[0];
    const reason =
      parsed.promptFeedback?.blockReason ??
      candidate?.finishReason ??
      'unknown';
    const filtered =
      Boolean(parsed.promptFeedback?.blockReason) ||
      [
        'SAFETY',
        'BLOCKLIST',
        'PROHIBITED_CONTENT',
        'RECITATION',
        'SPII',
      ].includes(reason);
    if (!candidate && !filtered)
      throw new ProviderError('No Google candidate returned', 502);
    if (!parsed.usageMetadata && !filtered)
      throw new ProviderError('Missing Google usage accounting', 502);
    const parts = candidate?.content?.parts ?? [];
    return GenerateResponseSchema.parse({
      text: parts
        .filter((p) => !p.thought)
        .map((p) => p.text ?? '')
        .join('\n'),
      reasoning:
        parts
          .filter((p) => p.thought)
          .map((p) => p.text ?? '')
          .join('\n') || undefined,
      finish_reason: reason,
      usage: {
        input: parsed.usageMetadata?.promptTokenCount ?? 0,
        output:
          (parsed.usageMetadata?.candidatesTokenCount ?? 0) +
          (parsed.usageMetadata?.thoughtsTokenCount ?? 0),
        reasoning: parsed.usageMetadata?.thoughtsTokenCount,
      },
      latency_ms: performance.now() - started,
      filter_layer: filtered ? 'api' : 'none',
      raw,
    });
  }
}
