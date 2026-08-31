import {
  compilationErrorMessage,
  configureCanvasContext,
  releaseCanvasContext,
  resizeCanvasToDisplaySize,
  throwIfAborted,
} from './webgpu';

export const VERTEX_STRIDE = 5 * Float32Array.BYTES_PER_ELEMENT;
export const POSITION_OFFSET = 0;
export const COLOR_OFFSET = 2 * Float32Array.BYTES_PER_ELEMENT;

export const INTERLEAVED_TRIANGLE_VERTICES = new Float32Array([
  0.00,  0.62, 0.98, 0.34, 0.28,
 -0.58, -0.52, 0.18, 0.72, 0.52,
  0.58, -0.52, 0.20, 0.50, 0.98,
]);

export const VERTEX_BUFFER_WGSL = `struct VertexInput {
  @location(0) position: vec2f,
  @location(1) color: vec3f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
}

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(input.position, 0.0, 1.0);
  output.color = input.color;
  return output;
}

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return vec4f(input.color, 1.0);
}`;

export const VERTEX_BUFFER_SETUP_SOURCE = `const vertexBuffer = device.createBuffer({
  label: 'position + color vertices',
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertices);

const vertexBufferLayout: GPUVertexBufferLayout = {
  arrayStride: 20,
  attributes: [
    { shaderLocation: 0, offset: 0, format: 'float32x2' },
    { shaderLocation: 1, offset: 8, format: 'float32x3' },
  ],
};`;

export interface VertexRecord {
  position: readonly [number, number];
  color: readonly [number, number, number];
  byteStart: number;
  byteEnd: number;
}

export interface VertexBufferTriangleSession {
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function readVertexRecord(index: number): VertexRecord {
  if (!Number.isInteger(index) || index < 0 || index >= 3) {
    throw new RangeError(`顶点索引 ${index} 超出 0–2`);
  }
  const start = index * 5;
  return {
    position: [INTERLEAVED_TRIANGLE_VERTICES[start], INTERLEAVED_TRIANGLE_VERTICES[start + 1]],
    color: [
      INTERLEAVED_TRIANGLE_VERTICES[start + 2],
      INTERLEAVED_TRIANGLE_VERTICES[start + 3],
      INTERLEAVED_TRIANGLE_VERTICES[start + 4],
    ],
    byteStart: index * VERTEX_STRIDE,
    byteEnd: (index + 1) * VERTEX_STRIDE - 1,
  };
}

export async function createVertexBufferTriangle(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<VertexBufferTriangleSession> {
  throwIfAborted(signal);
  if (!navigator.gpu) throw new Error('当前浏览器没有暴露 WebGPU。');
  const adapter = await navigator.gpu.requestAdapter();
  throwIfAborted(signal);
  if (!adapter) throw new Error('当前环境没有可用的 GPUAdapter。');
  const device = await adapter.requestDevice();
  try {
    throwIfAborted(signal);
  } catch (error) {
    device.destroy();
    throw error;
  }
  const context = canvas.getContext('webgpu');
  if (!context) {
    device.destroy();
    throw new Error('当前 Canvas 无法创建 GPUCanvasContext。');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  let contextOwner: symbol | null = null;
  let vertexBuffer: GPUBuffer | null = null;

  try {
    throwIfAborted(signal);
    contextOwner = configureCanvasContext(canvas, context, device, format);
    const module = device.createShaderModule({
      label: 'Vertex Buffer 实验 WGSL 模块',
      code: VERTEX_BUFFER_WGSL,
    });
    const compilationError = compilationErrorMessage(await module.getCompilationInfo());
    throwIfAborted(signal);
    if (compilationError) throw new Error(compilationError);

    const pipeline = await device.createRenderPipelineAsync({
      label: 'Vertex Buffer 实验渲染管线',
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vertexMain',
        buffers: [{
          arrayStride: VERTEX_STRIDE,
          attributes: [
            { shaderLocation: 0, offset: POSITION_OFFSET, format: 'float32x2' },
            { shaderLocation: 1, offset: COLOR_OFFSET, format: 'float32x3' },
          ],
        }],
      },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
    });
    throwIfAborted(signal);

    vertexBuffer = device.createBuffer({
      label: '交错位置与颜色 Vertex Buffer',
      size: INTERLEAVED_TRIANGLE_VERTICES.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, INTERLEAVED_TRIANGLE_VERTICES);

    let disposed = false;
    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: 'Vertex Buffer 实验命令编码器' });
      const pass = encoder.beginRenderPass({
        label: 'Vertex Buffer 实验 Render Pass',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    render();
    return {
      render,
      lost: device.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        vertexBuffer?.destroy();
        releaseCanvasContext(canvas, context, contextOwner);
        contextOwner = null;
        device.destroy();
      },
    };
  } catch (error) {
    vertexBuffer?.destroy();
    releaseCanvasContext(canvas, context, contextOwner);
    device.destroy();
    throw error;
  }
}
