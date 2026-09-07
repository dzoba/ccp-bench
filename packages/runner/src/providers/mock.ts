import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { GenerateRequest, GenerateResponse } from '@ccp-bench/schema';
import type { Provider } from './types';

export class MockProvider implements Provider {
  readonly id = 'mock';
  readonly cache_identity = 'mock:fixtures-v1';
  async listModels() {
    return [
      'mock-engaged',
      'mock-narrative',
      'mock-judge-a',
      'mock-judge-b',
      'mock-judge-c',
    ];
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
    if (req.model.startsWith('mock-judge-')) {
      const payload = z
        .object({
          visible_response: z.string(),
          narrative_flags: z.array(z.object({ id: z.string() })),
          required_facts: z.array(z.object({ id: z.string() })),
        })
        .parse(JSON.parse(req.messages.at(-1)!.content));
      const known = Object.values(fixtures).includes(payload.visible_response);
      if (!known)
        throw new Error('Mock judge only supports its explicit smoke fixtures');
      const refusal = payload.visible_response === fixtures.refusal;
      const narrative = payload.visible_response === fixtures.narrative;
      const text = JSON.stringify({
        label: refusal ? 'refusal' : narrative ? 'parroting' : 'engaged',
        refusal,
        evasion: refusal ? 4 : 0,
        flags_matched: narrative ? [payload.narrative_flags[0]!.id] : [],
        facts_present:
          refusal || narrative ? [] : payload.required_facts.map((f) => f.id),
        euphemisms: [],
        factual_errors: narrative ? ['Denies civilian killings.'] : [],
        asserts_contested_as_settled: false,
        rationale:
          'Explicit synthetic smoke fixture verdict, not a real model judgment.',
        confidence: 1,
      });
      return {
        text,
        finish_reason: 'stop',
        usage: { input: 0, output: 0 },
        latency_ms: 1,
        filter_layer: 'none',
      };
    }
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
