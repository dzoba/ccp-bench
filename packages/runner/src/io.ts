import { mkdir, readFile, rename, writeFile, open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { parse } from 'yaml';

export const root = fileURLToPath(new URL('../../../', import.meta.url));
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export const hash = (value: unknown): string =>
  createHash('sha256').update(canonical(value)).digest('hex');
export async function readYaml<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(parse(await readFile(path, 'utf8')));
}
export async function readJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  return schema.parse(JSON.parse(await readFile(path, 'utf8')));
}
export async function atomicJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = join(dirname(path), `.${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, path);
}
export async function appendJsonl(path: string, value: unknown): Promise<void> {
  const file = await open(path, 'a', 0o600);
  try {
    await file.write(JSON.stringify(value) + '\n');
    await file.sync();
  } finally {
    await file.close();
  }
}
export async function readJsonl<T>(
  path: string,
  schema: z.ZodType<T>,
  recoverTail = false,
): Promise<T[]> {
  let content: string;
  try {
    content = await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return [];
    throw error;
  }
  const lines = content.split('\n');
  const values: T[] = [];
  let validBytes = 0;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (!line) continue;
    if (index === lines.length - 1) {
      if (!recoverTail)
        throw new Error(`Unterminated JSONL record at ${path}:${index + 1}`);
      const file = await open(path, 'r+');
      try {
        await file.truncate(validBytes);
      } finally {
        await file.close();
      }
      break;
    }
    try {
      values.push(schema.parse(JSON.parse(line)));
    } catch (error) {
      throw new Error(`Invalid JSONL at ${path}:${index + 1}`, {
        cause: error,
      });
    }
    validBytes += Buffer.byteLength(line + '\n');
  }
  return values;
}
