import { describe, expect, it } from 'vitest';

import {
  createCheckerTextureData,
  TEXTURE_HEIGHT,
  TEXTURE_WIDTH,
} from './textures';

describe('texture basics data', () => {
  it('creates one RGBA texel for every coordinate', () => {
    const data = createCheckerTextureData();
    expect(data.byteLength).toBe(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    expect(Array.from(data.slice(0, 4))).toEqual([61, 169, 252, 255]);
  });

  it('supports deterministic custom dimensions', () => {
    expect(createCheckerTextureData(3, 2).byteLength).toBe(24);
    expect(createCheckerTextureData(3, 2)).toEqual(createCheckerTextureData(3, 2));
  });
});
