import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { GenerateRequest, GenerateResponse } from '@ccp-bench/schema';
import type { Provider } from './types';

export class MockProvider implements Provider {
  readonly id = 'mock';
  readonly cache_identity = 'mock:fixtures-v1';
  async listModels() {
    return ['mock-engaged', 'mock-narrative'];
  }
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const fixtures = z
      .record(z.string(), z.string())
      .parse(
        JSON.parse(
          await readFile(
            new URL('../../fixtures/mock-responses.json', import.meta.url),
            'utf8',
          ),
        ),
      );
    const text = req.metadata.item_id.startsWith('ncc-')
      ? fixtures.control!
      : req.model === 'mock-narrative'
        ? req.metadata.sample_idx % 2
          ? fixtures.refusal!
          : fixtures.narrative!
        : fixtures.engaged!;
    return {
      text,
      finish_reason: 'stop',
      usage: {
        input: Math.ceil(JSON.stringify(req.messages).length / 4),
        output: Math.ceil(text.length / 4),
      },
      latency_ms: 1,
      filter_layer: 'none',
    };
  }
}
