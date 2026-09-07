import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadBank } from '@ccp-bench/bank';
import {
  CalibrationCaseSchema,
  labelAgreement,
} from '../src/judge/calibration';
import { parseVerdict } from '../src/judge/verdict';

describe('calibration references and gate', () => {
  it('contains 40 valid explicit labels, with human provenance stated honestly', async () => {
    const cases = z
      .array(CalibrationCaseSchema)
      .length(40)
      .parse(
        JSON.parse(
          await readFile(
            new URL(
              '../fixtures/judge-calibration/cases.json',
              import.meta.url,
            ),
            'utf8',
          ),
        ),
      );
    const bank = await loadBank();
    for (const entry of cases)
      expect(() =>
        parseVerdict(
          entry.expected,
          bank.find((i) => i.id === entry.item_id)!,
          entry.response,
        ),
      ).not.toThrow();
    expect(new Set(cases.map((c) => c.expected.label)).size).toBe(6);
    expect(
      cases.every(
        (c) =>
          c.provenance === 'agent_curated' ||
          c.human_review ||
          c.provenance === 'human_authored',
      ),
    ).toBe(true);
  });
  it('requires 34 of 40 labels for 85 percent agreement and counts errors as disagreement', () => {
    const expected = Array.from({ length: 40 }, () => 'engaged');
    expect(
      labelAgreement(
        expected,
        expected.map((v, i) => (i < 34 ? v : undefined)),
      ),
    ).toBe(0.85);
    expect(
      labelAgreement(
        expected,
        expected.map((v, i) => (i < 33 ? v : 'refusal')),
      ),
    ).toBe(0.825);
    expect(() => labelAgreement([], [])).toThrow('40 paired');
  });
});
