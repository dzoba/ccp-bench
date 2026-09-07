import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '@ccp-bench/schema';
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible';
import { AnthropicProvider } from '../src/providers/anthropic';
import { GoogleProvider } from '../src/providers/google';
import { isTruncated } from '../src/providers/types';

afterEach(() => vi.unstubAllGlobals());
const req: GenerateRequest = {
  model: 'fixture',
  messages: [{ role: 'user', content: 'Question?' }],
  max_tokens: 4096,
  reasoning: 'default',
  metadata: { item_id: 'tam-001', lang: 'en', sample_idx: 0 },
};
function fixture(payload: unknown) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      ),
  );
}
describe('provider response boundaries', () => {
  it('keeps OpenAI-compatible visible text, reasoning, usage, and textual refusal separate', async () => {
    fixture({
      choices: [
        {
          message: {
            content: 'I cannot answer.',
            reasoning_content: 'Private trace',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        completion_tokens_details: { reasoning_tokens: 12 },
        cost: 0.02,
      },
    });
    const result = await new OpenAICompatibleProvider(
      'openrouter',
      'https://fixture.invalid/v1',
      'test',
    ).generate(req);
    expect(result.text).toBe('I cannot answer.');
    expect(result.reasoning).toBe('Private trace');
    expect(result.filter_layer).toBe('none');
    expect(result.provider_cost).toBe(0.02);
    expect(result.usage.output).toBe(20);
    expect(result.usage.reasoning).toBe(12);
  });
  it('recognizes explicit API content filters without inventing a model answer', async () => {
    fixture({
      choices: [
        { message: { content: null }, finish_reason: 'content_filter' },
      ],
    });
    const result = await new OpenAICompatibleProvider(
      'openrouter',
      'https://fixture.invalid/v1',
      'test',
    ).generate(req);
    expect(result.text).toBe('');
    expect(result.filter_layer).toBe('api');
  });
  it('captures Anthropic text and thinking blocks separately and detects truncation', async () => {
    fixture({
      content: [
        { type: 'thinking', thinking: 'Trace' },
        { type: 'text', text: 'Answer' },
      ],
      stop_reason: 'max_tokens',
      usage: { input_tokens: 5, output_tokens: 10 },
    });
    const result = await new AnthropicProvider('test').generate(req);
    expect(result.text).toBe('Answer');
    expect(result.reasoning).toBe('Trace');
    expect(isTruncated(result)).toBe(true);
  });
  it('captures Google thought tokens once in total billable output and handles prompt blocks', async () => {
    fixture({
      candidates: [
        {
          content: {
            parts: [{ text: 'Trace', thought: true }, { text: 'Answer' }],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 10,
        thoughtsTokenCount: 20,
      },
    });
    const result = await new GoogleProvider('test').generate(req);
    expect(result.text).toBe('Answer');
    expect(result.reasoning).toBe('Trace');
    expect(result.usage.output).toBe(30);
    fixture({ promptFeedback: { blockReason: 'SAFETY' } });
    const blocked = await new GoogleProvider('test').generate(req);
    expect(blocked.filter_layer).toBe('api');
    expect(blocked.text).toBe('');
  });
});
