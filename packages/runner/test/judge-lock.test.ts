import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { withWriterLock } from '../src/judge/lock';

it('prevents concurrent writers and releases the lock after a failed operation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ccp-judge-lock-'));
  const path = join(directory, 'writer.lock');
  try {
    await expect(
      withWriterLock(path, async () => {
        expect(JSON.parse(await readFile(path, 'utf8')).pid).toBe(process.pid);
        await expect(
          withWriterLock(path, async () => 'duplicate'),
        ).rejects.toThrow('Cannot acquire');
        throw new Error('failed request');
      }),
    ).rejects.toThrow('failed request');
    expect(await withWriterLock(path, async () => 'resumed')).toBe('resumed');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
