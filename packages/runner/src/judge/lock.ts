import { mkdir, open, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { hostname } from 'node:os';

/** A killed writer deliberately leaves evidence for a maintainer to inspect. */
export async function withWriterLock<T>(
  path: string,
  work: () => Promise<T>,
): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, 'wx', 0o600).catch((cause: unknown) => {
    throw new Error(
      `Cannot acquire writer lock ${path}. Inspect its hostname and PID; remove only after confirming that writer has stopped.`,
      { cause },
    );
  });
  try {
    await file.writeFile(
      JSON.stringify({
        pid: process.pid,
        hostname: hostname(),
        started_at: new Date().toISOString(),
      }) + '\n',
    );
    await file.sync();
    return await work();
  } finally {
    await file.close();
    await rm(path);
  }
}
