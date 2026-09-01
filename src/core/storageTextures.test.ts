import { describe, expect, it } from 'vitest';

import { STORAGE_TEXTURE_SIZE, workgroupCount } from './storageTextures';

describe('storage texture dispatch sizing', () => {
  it('covers the full texture with 8 × 8 workgroups', () => {
    expect(workgroupCount(STORAGE_TEXTURE_SIZE)).toBe(32);
    expect(workgroupCount(257)).toBe(33);
  });

  it('rejects invalid dimensions', () => {
    expect(() => workgroupCount(0)).toThrow(RangeError);
    expect(() => workgroupCount(32, 0)).toThrow(RangeError);
  });
});
