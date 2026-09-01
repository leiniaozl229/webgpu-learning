import { describe, expect, it } from 'vitest';

import { CUBE_FACE_LABELS, CUBE_FACE_SIZE, createCubeFaceData } from './cubeMaps';

describe('cube map face data', () => {
  it('creates six equally-sized RGBA array layers', () => {
    const faces = createCubeFaceData();
    expect(faces).toHaveLength(6);
    expect(CUBE_FACE_LABELS).toHaveLength(6);
    faces.forEach((face) => expect(face.byteLength).toBe(CUBE_FACE_SIZE ** 2 * 4));
  });

  it('keeps face colors distinguishable', () => {
    const faces = createCubeFaceData(8);
    const centerColors = faces.map((face) => Array.from(face.slice((4 * 8 + 4) * 4, (4 * 8 + 4) * 4 + 3)).join(','));
    expect(new Set(centerColors).size).toBe(6);
  });
});
