import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { reviewDataset } from '../../runner/src/judge/import-review';
import { CalibrationCaseSchema } from '../../runner/src/judge/calibration';
import { z } from 'zod';
import { loadBank } from '../../bank/src/index';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const cases = z
  .array(CalibrationCaseSchema)
  .parse(
    JSON.parse(
      await readFile(
        root + 'packages/runner/fixtures/judge-calibration/cases.json',
        'utf8',
      ),
    ),
  );
const { fingerprint, ...content } = reviewDataset(cases, await loadBank());
execFileSync(
  'pnpm',
  ['exec', 'vite', 'build', '--config', 'scripts/review-vite.config.ts'],
  { cwd: root + 'packages/web', stdio: 'inherit' },
);
const js = await readFile(root + '.cache/review-build/review.js', 'utf8');
const css = await readFile(root + '.cache/review-build/review.css', 'utf8');
const payload = JSON.stringify({ ...content, fingerprint }).replaceAll(
  '<',
  '\\u003c',
);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Calibration review | CCP Bench</title><meta name="description" content="Review forty benchmark calibration examples and export your decisions as JSON."><style>${css}</style></head><body><div id="root"></div><script type="application/json" id="review-data">${payload}</script><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
await mkdir(root + 'runs/calibration', { recursive: true });
await writeFile(root + 'runs/calibration/review.html', html);
console.log('Standalone review: ' + root + 'runs/calibration/review.html');
