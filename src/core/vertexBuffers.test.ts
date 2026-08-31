import { describe, expect, it } from 'vitest';

import {
  COLOR_OFFSET,
  INTERLEAVED_TRIANGLE_VERTICES,
  POSITION_OFFSET,
  readVertexRecord,
  VERTEX_STRIDE,
} from './vertexBuffers';

describe('vertex buffer layout', () => {
  it('uses byte-based stride and offsets', () => {
    expect(VERTEX_STRIDE).toBe(20);
    expect(POSITION_OFFSET).toBe(0);
    expect(COLOR_OFFSET).toBe(8);
    expect(INTERLEAVED_TRIANGLE_VERTICES.byteLength).toBe(60);
  });

  it('reads each interleaved vertex record with its byte range', () => {
    expect(readVertexRecord(1)).toEqual({
      position: [expect.closeTo(-0.58), expect.closeTo(-0.52)],
      color: [expect.closeTo(0.18), expect.closeTo(0.72), expect.closeTo(0.52)],
      byteStart: 20,
      byteEnd: 39,
    });
    expect(() => readVertexRecord(3)).toThrow(RangeError);
  });
});
