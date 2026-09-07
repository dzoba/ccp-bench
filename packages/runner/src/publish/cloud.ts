import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportStatic } from './static';
import { root } from '../io';
const exec = promisify(execFile);
const targets = {
  staging: 'ccp-bench-staging',
  prod: 'ccp-bench-prod',
} as const;
export async function publishRun(
  run: string,
  options: {
    target: keyof typeof targets;
    judgeSet?: string;
    provisional?: boolean;
    calibration?: string;
    dryRun?: boolean;
  },
) {
  // All gates and privacy scans finish before any external mutation.
  const result = await exportStatic(run, { ...options, dryRun: true });
  const project = targets[options.target];
  if (options.dryRun) return { ...result, project, dry_run: true };
  const git = (args: string[], cwd = root) => exec('git', args, { cwd });
  await git(['fetch', 'origin', 'main']);
  const branch = `publish/${run}-${result.version.split('-').at(-1)}`;
  const parent = await mkdtemp(join(tmpdir(), 'ccp-publish-'));
  const worktree = join(parent, 'checkout');
  let added = false;
  try {
    await git(['worktree', 'add', '-b', branch, worktree, 'origin/main']);
    added = true;
    const exported = await exportStatic(run, {
      ...options,
      destination: join(worktree, 'packages/web/public/data'),
    });
    if (exported.version !== result.version)
      throw new Error(
        'Inputs changed during publication; retry after writers finish',
      );
    await exec('gcloud', [
      'storage',
      'cp',
      '--recursive',
      join(root, 'runs', run),
      `gs://${project}-runs/runs/`,
      `--project=${project}`,
      '--quiet',
    ]);
    await git(['add', '--', 'packages/web/public/data'], worktree);
    await git(['commit', '-m', `Publish ${run} (${result.status})`], worktree);
    await git(['push', '--set-upstream', 'origin', branch], worktree);
    const body = join(parent, 'body.md');
    await writeFile(
      body,
      `Publish benchmark run \`${run}\` to ${options.target}.\n\nStatus: **${result.status}**. ${result.files} static JSON files (${result.bytes} bytes) passed schema and held-out leak checks. Raw artifacts are archived privately in Cloud Storage.\n\n${result.limitations.map((l) => '- ' + l).join('\n')}\n\nMerging triggers staging deployment. After deployment, run the documented Firestore index command with your maintainer identity. The GitHub identity has no database access.\n`,
    );
    const pr = await exec(
      'gh',
      [
        'pr',
        'create',
        '--base',
        'main',
        '--head',
        branch,
        '--title',
        `Publish ${run} (${result.status})`,
        '--body-file',
        body,
      ],
      { cwd: root },
    );
    return { ...result, project, pull_request: pr.stdout.trim() };
  } finally {
    if (added) await git(['worktree', 'remove', worktree]);
    await rm(parent, { recursive: true, force: true });
  }
}
