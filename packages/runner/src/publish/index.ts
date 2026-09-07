import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { z } from 'zod';
import { PublicIndexSchema } from '@ccp-bench/schema';
import { readJson, root } from '../io';
const exec = promisify(execFile);
export async function indexPublishedRun(target: 'staging' | 'prod') {
  const project = `ccp-bench-${target}`;
  const base = join(root, 'packages/web/public/data');
  const { version } = await readJson(
    join(base, 'current.json'),
    z.object({ version: z.string().regex(/^[\w.-]+$/) }),
  );
  const index = await readJson(
    join(base, version, 'index.json'),
    PublicIndexSchema,
  );
  // Refuse to claim publication unless Hosting serves this exact version.
  const response = await fetch(`https://${project}.web.app/data/current.json`, {
    cache: 'no-store',
  });
  if (
    !response.ok ||
    z.object({ version: z.string() }).parse(await response.json()).version !==
      version
  )
    throw new Error(
      'Hosting does not serve the local data version; deploy it before indexing',
    );
  const { stdout: token } = await exec('gcloud', [
    'auth',
    'print-access-token',
  ]);
  const { stdout: account } = await exec('gcloud', [
    'config',
    'get-value',
    'account',
  ]);
  function value(v: unknown): unknown {
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } };
    if (v && typeof v === 'object')
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(v).map(([k, x]) => [k, value(x)]),
          ),
        },
      };
    return { stringValue: String(v) };
  }
  const document = {
    version,
    date: index.date,
    models: index.models.map((m) => m.key),
    totals: index.coverage,
    status: index.status,
    published: true,
    published_by: account.trim(),
  };
  const result = await fetch(
    `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/runs/${encodeURIComponent(index.run_id)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(document).map(([k, v]) => [k, value(v)]),
        ),
      }),
    },
  );
  if (!result.ok) throw new Error(`Firestore index failed: ${result.status}`);
  return { project, run: index.run_id, version };
}
