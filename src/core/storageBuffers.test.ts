import { describe, expect, it } from 'vitest';

import {
  createStorageInstanceValues,
  MAX_STORAGE_INSTANCES,
  STORAGE_INSTANCE_BYTES,
} from './storageBuffers';

describe('storage instance data', () => {
  it('packs every instance into one aligned 32-byte record', () => {
    const values = createStorageInstanceValues(4);
    expect(values.byteLength).toBe(4 * STORAGE_INSTANCE_BYTES);
    expect(values.length).toBe(32);
    expect(values[3]).toBe(1);
    expect(values[11]).toBe(1);
  });

  it('keeps generated offsets in clip-space bounds', () => {
    const values = createStorageInstanceValues(MAX_STORAGE_INSTANCES);
    for (let index = 0; index < MAX_STORAGE_INSTANCES; index += 1) {
      const offset = index * 8;
      expect(Math.abs(values[offset + 4])).toBeLessThan(1);
      expect(Math.abs(values[offset + 5])).toBeLessThan(1);
      expect(values[offset + 6]).toBeGreaterThan(0);
    }
  });

  it('rejects counts outside the allocated runtime array', () => {
    expect(() => createStorageInstanceValues(0)).toThrow(RangeError);
    expect(() => createStorageInstanceValues(MAX_STORAGE_INSTANCES + 1)).toThrow(RangeError);
  });
});
