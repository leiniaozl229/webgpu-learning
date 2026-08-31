import {
  compilationErrorMessage,
  configureCanvasContext,
  releaseCanvasContext,
  resizeCanvasToDisplaySize,
  throwIfAborted,
} from './webgpu';

export const MAX_STORAGE_INSTANCES = 64;
export const STORAGE_INSTANCE_FLOATS = 8;
export const STORAGE_INSTANCE_BYTES = STORAGE_INSTANCE_FLOATS * Float32Array.BYTES_PER_ELEMENT;

export const STORAGE_INSTANCING_WGSL = `struct InstanceData {
  color: vec4f,
  offset: vec2f,
  scale: vec2f,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@group(0) @binding(0) var<storage, read> instances: array<InstanceData>;

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
  let positions = array(
    vec2f( 0.0,  0.70),
    vec2f(-0.62, -0.55),
    vec2f( 0.62, -0.55),
  );
  let instance = instances[instanceIndex];

  var output: VertexOutput;
  output.position = vec4f(
    positions[vertexIndex] * instance.scale + instance.offset,
    0.0,
    1.0,
  );
  output.color = instance.color;
  return output;
}

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}`;

export interface StorageBufferSession {
  updateCount: (count: number) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function createStorageInstanceValues(count: number): Float32Array {
  if (!Number.isInteger(count) || count < 1 || count > MAX_STORAGE_INSTANCES) {
    throw new RangeError(`实例数量必须位于 1–${MAX_STORAGE_INSTANCES}`);
  }

  const values = new Float32Array(count * STORAGE_INSTANCE_FLOATS);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const cellWidth = 1.7 / columns;
  const cellHeight = 1.7 / rows;
  const size = Math.min(cellWidth, cellHeight) * 0.42;

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offset = index * STORAGE_INSTANCE_FLOATS;
    values.set([
      0.25 + ((index * 37) % 70) / 100,
      0.30 + ((index * 53) % 65) / 100,
      0.35 + ((index * 29) % 60) / 100,
      1,
      -0.85 + cellWidth * (column + 0.5),
      0.85 - cellHeight * (row + 0.5),
      size,
      size,
    ], offset);
  }

  return values;
}

export async function createStorageBufferSession(
  canvas: HTMLCanvasElement,
  initialCount: number,
  signal: AbortSignal,
): Promise<StorageBufferSession> {
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
  let storageBuffer: GPUBuffer | null = null;

  try {
    contextOwner = configureCanvasContext(canvas, context, device, format);
    const module = device.createShaderModule({
      label: 'Storage Buffer 多实例 WGSL 模块',
      code: STORAGE_INSTANCING_WGSL,
    });
    const compilationError = compilationErrorMessage(await module.getCompilationInfo());
    throwIfAborted(signal);
    if (compilationError) throw new Error(compilationError);

    const pipeline = await device.createRenderPipelineAsync({
      label: 'Storage Buffer 多实例渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
    });
    throwIfAborted(signal);

    const createdStorageBuffer = device.createBuffer({
      label: '多实例只读 Storage Buffer',
      size: MAX_STORAGE_INSTANCES * STORAGE_INSTANCE_BYTES,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    storageBuffer = createdStorageBuffer;
    const bindGroup = device.createBindGroup({
      label: '多实例 Storage Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: createdStorageBuffer } }],
    });

    let instanceCount = initialCount;
    let disposed = false;
    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: 'Storage Buffer 实验命令编码器' });
      const pass = encoder.beginRenderPass({
        label: 'Storage Buffer 实验 Render Pass',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3, instanceCount);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    const updateCount = (count: number) => {
      if (disposed) return;
      const values = createStorageInstanceValues(count);
      instanceCount = count;
      device.queue.writeBuffer(createdStorageBuffer, 0, values);
      render();
    };

    updateCount(initialCount);
    return {
      updateCount,
      render,
      lost: device.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        storageBuffer?.destroy();
        releaseCanvasContext(canvas, context, contextOwner);
        contextOwner = null;
        device.destroy();
      },
    };
  } catch (error) {
    storageBuffer?.destroy();
    releaseCanvasContext(canvas, context, contextOwner);
    device.destroy();
    throw error;
  }
}
