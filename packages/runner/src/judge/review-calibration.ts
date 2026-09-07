import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { join } from 'node:path';
import { z } from 'zod';
import { loadBank } from '@ccp-bench/bank';
import { atomicJson, readJson, root } from '../io';
import { CalibrationCaseSchema } from './calibration';
import { parseVerdict } from './verdict';

export async function reviewCalibration(reviewer: string): Promise<void> {
  if (!stdin.isTTY)
    throw new Error(
      'Calibration review requires a human at an interactive terminal',
    );
  const path = join(
    root,
    'packages/runner/fixtures/judge-calibration/cases.json',
  );
  const cases = await readJson(path, z.array(CalibrationCaseSchema).length(40));
  const bank = await loadBank();
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    for (const entry of cases) {
      if (entry.human_review) continue;
      const item = bank.find((i) => i.id === entry.item_id)!;
      stdout.write(
        `\n${entry.id}\n${item.prompts.en}\nReference: ${item.reference_answer}\n\nAnswer: ${entry.response}\n\nRubric: ${JSON.stringify({ flags: item.narrative_flags, facts: item.required_facts }, null, 2)}\nExpected: ${JSON.stringify(entry.expected, null, 2)}\n`,
      );
      const input = await terminal.question(
        'a to approve after review, JSON verdict to correct, s to skip, q to quit: ',
      );
      if (input === 'q') break;
      if (input === 's') continue;
      try {
        entry.expected = parseVerdict(
          input === 'a' ? entry.expected : input,
          item,
          entry.response,
        );
        entry.human_review = {
          reviewed_by: reviewer,
          reviewed_at: new Date().toISOString(),
        };
        await atomicJson(path, cases);
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
