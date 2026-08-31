import { describe, expect, it } from 'vitest';

import FUNDAMENTALS_COMPUTE_SOURCE from '../examples/chapter01/compute.ts?raw';
import FUNDAMENTALS_HTML_SOURCE from '../examples/chapter01/index.html?raw';
import FUNDAMENTALS_RENDER_SOURCE from '../examples/chapter01/render.ts?raw';

function expectInOrder(source: string, fragments: string[]) {
  let previousIndex = -1;
  for (const fragment of fragments) {
    const index = source.indexOf(fragment, previousIndex + 1);
    expect(index, `缺少或顺序错误：${fragment}`).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
}

describe('first lesson complete sources', () => {
  it('provides the HTML entry, Canvas, status region and module script', () => {
    expect(FUNDAMENTALS_HTML_SOURCE).toContain('id="webgpu-canvas"');
    expect(FUNDAMENTALS_HTML_SOURCE).toContain('id="status"');
    expect(FUNDAMENTALS_HTML_SOURCE).toContain('src="./src/render.ts"');
  });

  it('keeps the render program complete and ordered', () => {
    expect(FUNDAMENTALS_RENDER_SOURCE).not.toContain('...');
    expectInOrder(FUNDAMENTALS_RENDER_SOURCE, [
      'navigator.gpu',
      'requestAdapter()',
      'requestDevice()',
      "getContext('webgpu')",
      'context.configure',
      'createShaderModule',
      'getCompilationInfo',
      'createRenderPipelineAsync',
      'createCommandEncoder',
      'beginRenderPass',
      'setPipeline',
      'draw(3)',
      'pass.end()',
      'queue.submit',
      'ResizeObserver',
      'context.unconfigure()',
    ]);
    expect(FUNDAMENTALS_RENDER_SOURCE).toContain('device.lost');
    expect(FUNDAMENTALS_RENDER_SOURCE).toContain('device.destroy()');
  });

  it('keeps the compute and readback program complete and ordered', () => {
    expect(FUNDAMENTALS_COMPUTE_SOURCE).not.toContain('...');
    expectInOrder(FUNDAMENTALS_COMPUTE_SOURCE, [
      'createComputePipelineAsync',
      'GPUBufferUsage.STORAGE',
      'queue.writeBuffer',
      'createBindGroup',
      'beginComputePass',
      'dispatchWorkgroups',
      'copyBufferToBuffer',
      'queue.submit',
      'mapAsync',
      'getMappedRange().slice(0)',
      'resultBuffer.unmap()',
    ]);
    expect(FUNDAMENTALS_COMPUTE_SOURCE).toContain('workBuffer?.destroy()');
    expect(FUNDAMENTALS_COMPUTE_SOURCE).toContain('device.destroy()');
  });
});
