import { describe, expect, it } from 'vitest';
import { loadBank } from '../src/index';
import { registerVersions, validateVersions } from '../src/versions';

const [item] = await loadBank();
if (!item) throw new Error('Missing fixture item');
describe('stable item versions', () => {
  it('rejects wording changes without a version increment', () => {
    const ledger = registerVersions([item], {});
    const changed = { ...item, prompts: { en: 'A new question?' } };
    expect(() => registerVersions([changed], ledger)).toThrow(
      'Wording changed',
    );
    expect(() => validateVersions([changed], ledger)).toThrow('Unregistered');
    const bumped = { ...changed, version: 2 };
    expect(() =>
      validateVersions([bumped], registerVersions([bumped], ledger)),
    ).not.toThrow();
  });
  it('preserves deleted IDs and prevents old versions being reused', () => {
    const ledger = registerVersions([item], {});
    expect(() => registerVersions([], ledger)).toThrow('Missing historical ID');
    const next = registerVersions([{ ...item, version: 2 }], ledger);
    expect(() => registerVersions([item], next)).toThrow('Cannot reuse');
  });
});
