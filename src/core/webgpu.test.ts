import { describe, expect, it, vi } from 'vitest';

import {
  configureCanvasContext,
  releaseCanvasContext,
  resizeCanvasToDisplaySize,
  throwIfAborted,
} from './webgpu';

function createCanvas(clientWidth: number, clientHeight: number) {
  return {
    width: 0,
    height: 0,
    clientWidth,
    clientHeight,
  } as HTMLCanvasElement;
}

describe('resizeCanvasToDisplaySize', () => {
  it('uses pixel ratio and reports whether the drawing buffer changed', () => {
    const canvas = createCanvas(320, 180);

    expect(resizeCanvasToDisplaySize(canvas, 8192, 2)).toBe(true);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(resizeCanvasToDisplaySize(canvas, 8192, 2)).toBe(false);
  });

  it('clamps both axes to maxTextureDimension2D and keeps them non-zero', () => {
    const large = createCanvas(10_000, 8_000);
    resizeCanvasToDisplaySize(large, 4096, 2);
    expect([large.width, large.height]).toEqual([4096, 3277]);

    const empty = createCanvas(0, 0);
    resizeCanvasToDisplaySize(empty, 4096, 1);
    expect([empty.width, empty.height]).toEqual([1, 1]);
  });
});

describe('GPUCanvasContext ownership', () => {
  it('lets only the latest session unconfigure a shared canvas context', () => {
    const canvas = createCanvas(320, 180);
    const context = {
      configure: vi.fn(),
      unconfigure: vi.fn(),
    } as unknown as GPUCanvasContext;
    const device = {} as GPUDevice;

    const firstOwner = configureCanvasContext(canvas, context, device, 'bgra8unorm');
    const secondOwner = configureCanvasContext(canvas, context, device, 'bgra8unorm');

    releaseCanvasContext(canvas, context, firstOwner);
    expect(context.unconfigure).not.toHaveBeenCalled();

    releaseCanvasContext(canvas, context, secondOwner);
    expect(context.unconfigure).toHaveBeenCalledOnce();
  });

  it('throws the AbortSignal reason before stale initialization continues', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow();
  });
});
