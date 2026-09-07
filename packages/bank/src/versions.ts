import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Item } from '@ccp-bench/schema';

export const VersionLedgerSchema = z.record(
  z.string(),
  z.record(z.string().regex(/^[1-9]\d*$/), z.string().regex(/^[a-f0-9]{64}$/)),
);
export type VersionLedger = z.infer<typeof VersionLedgerSchema>;
export function itemFingerprint(item: Item): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        prompts: item.prompts,
        narrative_flags: item.narrative_flags,
        required_facts: item.required_facts,
      }),
    )
    .digest('hex');
}
export function validateVersions(items: Item[], ledger: VersionLedger): void {
  for (const item of items) {
    const history = ledger[item.id];
    if (!history || history[String(item.version)] !== itemFingerprint(item))
      throw new Error(
        `Unregistered wording or version for ${item.id}; bump the version and register it`,
      );
    if (Math.max(...Object.keys(history).map(Number)) !== item.version)
      throw new Error(`Version regression for ${item.id}`);
  }
  for (const id of Object.keys(ledger))
    if (!items.some((i) => i.id === id))
      throw new Error(
        `Missing historical ID ${id}; keep the item with review_status retired rather than deleting it`,
      );
}
export function registerVersions(
  items: Item[],
  previous: VersionLedger,
): VersionLedger {
  const next = structuredClone(previous);
  for (const item of items) {
    const history = next[item.id] ?? {};
    const existing = history[String(item.version)];
    const fingerprint = itemFingerprint(item);
    if (existing && existing !== fingerprint)
      throw new Error(`Wording changed without version bump: ${item.id}`);
    const maximum = Math.max(0, ...Object.keys(history).map(Number));
    if (item.version < maximum)
      throw new Error(`Cannot reuse historical version: ${item.id}`);
    if (!existing && item.version !== maximum + 1)
      throw new Error(`Versions must advance by one: ${item.id}`);
    next[item.id] = { ...history, [item.version]: fingerprint };
  }
  validateVersions(items, next);
  return next;
}
