import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import {
  GenerateRequestSchema,
  GenerateResponseSchema,
  ManifestSchema,
  ModelSchema,
  PricesSchema,
  ResponseRecordSchema,
  RunConfigSchema,
  JudgeConfigSchema,
  JudgeVerdictSchema,
  JudgeRecordSchema,
  HumanReviewSchema,
  ScoringWeightsSchema,
  ScoresSchema,
} from '@ccp-bench/schema';
import { root } from './io';

export async function generateSchemaDocs(): Promise<void> {
  const schemas = {
    RunConfig: RunConfigSchema,
    Model: ModelSchema,
    GenerateRequest: GenerateRequestSchema,
    GenerateResponse: GenerateResponseSchema,
    ResponseRecord: ResponseRecordSchema,
    Manifest: ManifestSchema,
    Prices: PricesSchema,
    JudgeConfig: JudgeConfigSchema,
    JudgeVerdict: JudgeVerdictSchema,
    JudgeRecord: JudgeRecordSchema,
    HumanReview: HumanReviewSchema,
    ScoringWeights: ScoringWeightsSchema,
    Scores: ScoresSchema,
  };
  const blocks = Object.entries(schemas).map(
    ([name, schema]) =>
      `## ${name}\n\n\`\`\`json\n${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n\`\`\`\n`,
  );
  await writeFile(
    join(root, 'docs/RUN_SCHEMAS.md'),
    '# Run schemas\n\nGenerated from the shared Zod schemas. Runtime refinements additionally reject duplicate model, language, and item selections. Unknown raw provider payloads are retained privately for diagnosis.\n\n' +
      blocks.join('\n'),
  );
}
