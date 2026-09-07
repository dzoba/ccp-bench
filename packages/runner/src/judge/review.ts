import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { join } from 'node:path';
import {
  HumanReviewSchema,
  JudgeRecordSchema,
  ManifestSchema,
  ResponseRecordSchema,
} from '@ccp-bench/schema';
import { appendJsonl, readJson, readJsonl } from '../io';
import { judgeDirectory } from './paths';
import { parseVerdict, requiresReview } from './verdict';

export async function reviewRun(
  directory: string,
  reviewer: string,
  judgeSet = 'default',
): Promise<void> {
  if (!stdin.isTTY)
    throw new Error('Human review requires an interactive terminal');
  const manifest = await readJson(
    join(directory, 'manifest.json'),
    ManifestSchema,
  );
  const responses = await readJsonl(
    join(directory, 'responses.jsonl'),
    ResponseRecordSchema,
  );
  const output = judgeDirectory(directory, judgeSet);
  const judgments = await readJsonl(
    join(output, 'judgments.jsonl'),
    JudgeRecordSchema,
  );
  const reviewed = new Set(
    (
      await readJsonl(join(output, 'human-reviews.jsonl'), HumanReviewSchema)
    ).map((r) => r.sample_id),
  );
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    for (const sample of responses) {
      if (reviewed.has(sample.sample_id)) continue;
      const item = manifest.items.find((i) => i.id === sample.item_id)!;
      const [a, b] = judgments.filter(
        (j) => j.sample_id === sample.sample_id && j.role === 'headline',
      );
      if (
        !a?.verdict ||
        !b?.verdict ||
        !requiresReview(item, a.verdict, b.verdict)
      )
        continue;
      stdout.write(
        `\n${sample.sample_id}\n${item.prompts[sample.lang]}\n\n${sample.response.text}\n\nA: ${JSON.stringify(a.verdict, null, 2)}\nB: ${JSON.stringify(b.verdict, null, 2)}\n`,
      );
      const choice = await terminal.question(
        'Choose a/b, paste a full JSON verdict, s to skip, or q to quit: ',
      );
      if (choice === 'q') break;
      if (choice === 's') continue;
      try {
        const verdict = parseVerdict(
          choice === 'a' ? a.verdict : choice === 'b' ? b.verdict : choice,
          item,
          sample.response.text,
        );
        const record = HumanReviewSchema.parse({
          sample_id: sample.sample_id,
          verdict,
          reviewed_by: reviewer,
          reviewed_at: new Date().toISOString(),
        });
        await appendJsonl(join(output, 'human-reviews.jsonl'), record);
      } catch (error) {
        stdout.write(
          `Not recorded: ${error instanceof Error ? error.message : String(error)}\n`,
        );
      }
    }
  } finally {
    terminal.close();
  }
}
