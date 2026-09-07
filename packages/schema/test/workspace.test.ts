import { describe, expect, it } from 'vitest';
import { packageName } from '../src/index';

describe('workspace resolution', () => {
  it('exposes the shared package', () => {
    expect(packageName).toBe('@ccp-bench/schema');
  });
});
