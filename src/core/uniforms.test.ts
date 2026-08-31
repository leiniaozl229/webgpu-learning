import { describe, expect, it } from 'vitest';

import { hexToRgba, packUniformValues } from './uniforms';

describe('uniform helpers', () => {
  it('converts CSS hex colors to normalized RGBA', () => {
    expect(hexToRgba('#ff8000')).toEqual([1, 128 / 255, 0, 1]);
    expect(() => hexToRgba('blue')).toThrow('无法解析颜色');
  });

  it('packs color, offset and scale into one 32-byte array', () => {
    const packed = packUniformValues({
      color: [1, 0.5, 0.25, 1],
      offset: [0.2, -0.1],
      scale: [0.8, 0.9],
    });

    expect(packed.byteLength).toBe(32);
    expect(Array.from(packed)).toEqual([
      1, 0.5, 0.25, 1,
      expect.closeTo(0.2), expect.closeTo(-0.1),
      expect.closeTo(0.8), expect.closeTo(0.9),
    ]);
  });
});
