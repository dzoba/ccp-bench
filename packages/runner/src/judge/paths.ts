import { join } from 'node:path';
import { z } from 'zod';
export function judgeDirectory(directory: string, name = 'default'): string {
  const set = z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
    .parse(name);
  return set === 'default' ? directory : join(directory, 'judge-sets', set);
}
