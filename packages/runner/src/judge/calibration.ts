import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { loadBank } from '@ccp-bench/bank';
import {
  JudgeVerdictSchema,
  type JudgeConfig,
  type Model,
  type Prices,
} from '@ccp-bench/schema';
import { atomicJson, hash, readJson, root } from '../io';
import { createProvider, verifyModels } from '../providers';
import { isTruncated, ProviderError } from '../providers/types';
import { responseCost } from '../estimate';
import { TokenBucket } from '../scheduler';
import { judgeTokenLimit } from './settings';
import { parseVerdict } from './verdict';
import { withWriterLock } from './lock';

export const CalibrationCaseSchema = z.strictObject({
  id: z.string(),
  item_id: z.string(),
  response: z.string(),
  expected: JudgeVerdictSchema,
  provenance: z.enum(['agent_curated', 'human_authored']),
  human_review: z
    .object({ reviewed_by: z.string().min(1), reviewed_at: z.iso.datetime() })
    .nullable(),
});
export const CalibrationResultSchema = z.strictObject({
  case_id: z.string(),
  judge_key: z.string(),
  label: z.string().optional(),
  error: z.string().optional(),
  correct: z.boolean(),
  cost_usd: z.number().nonnegative(),
});
export const CalibrationReportSchema = z.strictObject({
  prompt_hash: z.string(),
  cases_hash: z.string(),
  config_hash: z.string(),
  model_hash: z.string(),
  created_at: z.iso.datetime(),
  human_validated: z.boolean(),
  max_tokens: z.number(),
  results: z.array(CalibrationResultSchema),
  judges: z.array(
    z.object({
      judge_key: z.string(),
      agreement: z.number(),
      passed: z.boolean(),
      cases: z.number(),
    }),
  ),
  passed: z.boolean(),
  cost_usd: z.number().nonnegative(),
});

export function labelAgreement(
  expected: string[],
  actual: (string | undefined)[],
): number {
  if (expected.length !== actual.length || expected.length !== 40)
    throw new Error('Calibration requires 40 paired cases');
  return (
    expected.filter((label, i) => label === actual[i]).length / expected.length
  );
}
export async function calibrateJudges(
  ...args: Parameters<typeof calibrateJudgesUnlocked>
): Promise<z.infer<typeof CalibrationReportSchema>> {
  return withWriterLock(`${args[3]}.lock`, () =>
    calibrateJudgesUnlocked(...args),
  );
}
async function calibrateJudgesUnlocked(
  registry: Model[],
  prices: Prices,
  config: JudgeConfig,
  destination: string,
): Promise<z.infer<typeof CalibrationReportSchema>> {
  const { cases, bank, judges, system, schema, identity } =
    await calibrationInputs(registry, config);
  await verifyModels(judges);
  let results: z.infer<typeof CalibrationResultSchema>[] = [];
  try {
    const previous = await readJson(destination, CalibrationReportSchema);
    if (
      Object.entries(identity).some(
        ([key, value]) => previous[key as keyof typeof identity] !== value,
      )
    )
      throw new Error(
        'Calibration inputs changed; use a different output artifact',
      );
    results = previous.results;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT'))
      throw error;
  }
  const humanValidated = cases.every(
    (c) => c.provenance === 'human_authored' || c.human_review !== null,
  );
  function report() {
    const summaries = judges.map((judge) => {
      const labels = cases.map(
        (c) =>
          results.find((r) => r.judge_key === judge.key && r.case_id === c.id)
            ?.label,
      );
      const agreement = labelAgreement(
        cases.map((c) => c.expected.label),
        labels,
      );
      const count = results.filter((r) => r.judge_key === judge.key).length;
      return {
        judge_key: judge.key,
        agreement,
        passed: count === 40 && agreement >= 0.85,
        cases: count,
      };
    });
    return CalibrationReportSchema.parse({
      ...identity,
      created_at: new Date().toISOString(),
      human_validated: humanValidated,
      max_tokens: config.max_tokens,
      results,
      judges: summaries,
      passed: humanValidated && summaries.every((j) => j.passed),
      cost_usd: results.reduce((n, r) => n + r.cost_usd, 0),
    });
  }
  for (const judge of judges) {
    const provider = createProvider(judge);
    const bucket = new TokenBucket(config.requests_per_minute);
    for (const entry of cases) {
      if (
        results.some((r) => r.case_id === entry.id && r.judge_key === judge.key)
      )
        continue;
      const item = bank.find((i) => i.id === entry.item_id);
      if (!item) throw new Error(`Unknown calibration item ${entry.item_id}`);
      const payload = {
        question: item.prompts.en,
        type: item.type,
        contested: item.contested,
        contested_note: item.contested_note,
        narrative_flags: item.narrative_flags,
        required_facts: item.required_facts,
        reference_answer: item.reference_answer,
        visible_response: entry.response,
      };
      const price = prices[judge.key];
      if (!price) throw new Error(`Missing judge prices ${judge.key}`);
      const estimate =
        (Math.ceil(Buffer.byteLength(system + JSON.stringify(payload)) / 3) *
          price.input_per_million +
          judgeTokenLimit(judge, config) * price.output_per_million) /
        1e6;
      let cost = 0,
        label: string | undefined,
        errorText: string | undefined;
      let fatalError = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (report().cost_usd + cost + estimate > config.max_cost_usd) {
          if (cost > 0) {
            results.push({
              case_id: entry.id,
              judge_key: judge.key,
              error: 'Budget exhausted before retrying invalid verdict',
              correct: false,
              cost_usd: cost,
            });
            await atomicJson(destination, report());
          }
          throw new Error(
            'Calibration budget exhausted, partial results preserved',
          );
        }
        await bucket.take();
        try {
          const response = await provider.generate({
            model: judge.endpoint.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: JSON.stringify(payload) },
            ],
            temperature: 0,
            max_tokens: judgeTokenLimit(judge, config),
            reasoning: 'default',
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'judge_verdict', strict: true, schema },
            },
            metadata: { item_id: item.id, lang: 'en', sample_idx: 0 },
          });
          cost += responseCost(response, judge, prices);
          if (isTruncated(response) || response.filter_layer === 'api')
            throw new Error('Incomplete calibration verdict');
          label = parseVerdict(response.text, item, entry.response).label;
          break;
        } catch (error) {
          errorText =
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'Calibration error';
          if (
            error instanceof ProviderError &&
            [401, 402, 403, 404].includes(error.status)
          ) {
            fatalError = true;
            break;
          }
        }
      }
      results.push({
        case_id: entry.id,
        judge_key: judge.key,
        label,
        error: label ? undefined : errorText,
        correct: label === entry.expected.label,
        cost_usd: cost,
      });
      await atomicJson(destination, report());
      if (fatalError)
        throw new Error(
          `Calibration stopped after ${errorText}; partial report preserved`,
        );
      if (results.length % 10 === 0)
        console.log(
          `Calibration: ${results.length}/${cases.length * judges.length} judgments, $${report().cost_usd.toFixed(4)}`,
        );
    }
  }
  const final = report();
  await atomicJson(destination, final);
  return final;
}

export async function calibrationInputs(
  registry: Model[],
  config: JudgeConfig,
) {
  const cases = await readJson(
    join(root, 'packages/runner/fixtures/judge-calibration/cases.json'),
    z.array(CalibrationCaseSchema).length(40),
  );
  const bank = await loadBank();
  const judges = config.judges.map((key) => {
    const model = registry.find((m) => m.key === key);
    if (!model || model.origin === 'prc' || model.endpoint.provider === 'mock')
      throw new Error(`Calibration requires a real non-PRC judge: ${key}`);
    return model;
  });
  if (new Set(judges.map((m) => m.family)).size !== judges.length)
    throw new Error('Calibration judge families must be distinct');
  const system = await readFile(
    new URL('prompts/v1.md', import.meta.url),
    'utf8',
  );
  const schema = z.toJSONSchema(JudgeVerdictSchema);
  const identity = {
    prompt_hash: hash({ system, schema }),
    cases_hash: hash({
      cases: cases.map((c) => ({
        id: c.id,
        item_id: c.item_id,
        response: c.response,
        expected: c.expected,
      })),
      items: bank
        .filter((i) => cases.some((c) => c.item_id === i.id))
        .map((i) => ({
          id: i.id,
          version: i.version,
          prompts: i.prompts,
          type: i.type,
          contested: i.contested,
          contested_note: i.contested_note,
          narrative_flags: i.narrative_flags,
          required_facts: i.required_facts,
          reference_answer: i.reference_answer,
        })),
    }),
    config_hash: hash(config),
    model_hash: hash(judges),
  };
  return { cases, bank, judges, system, schema, identity };
}
