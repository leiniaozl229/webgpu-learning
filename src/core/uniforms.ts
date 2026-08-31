import {
  compilationErrorMessage,
  configureCanvasContext,
  releaseCanvasContext,
  resizeCanvasToDisplaySize,
  throwIfAborted,
} from './webgpu';

export const UNIFORM_TRIANGLE_WGSL = `struct Uniforms {
  color: vec4f,
  offset: vec2f,
  scale: vec2f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> @builtin(position) vec4f {
  let positions = array(
    vec2f( 0.0,  0.55),
    vec2f(-0.52, -0.48),
    vec2f( 0.52, -0.48),
  );
  let position = positions[vertexIndex] * uniforms.scale + uniforms.offset;
  return vec4f(position, 0.0, 1.0);
}

@fragment fn fragmentMain() -> @location(0) vec4f {
  return uniforms.color;
}`;

export interface UniformTriangleValues {
  color: readonly [number, number, number, number];
  offset: readonly [number, number];
  scale: readonly [number, number];
}

export interface UniformTriangleSession {
  update: (values: UniformTriangleValues) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function packUniformValues(values: UniformTriangleValues): Float32Array {
  return new Float32Array([
    ...values.color,
    ...values.offset,
    ...values.scale,
  ]);
}

export function hexToRgba(hex: string): [number, number, number, number] {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`无法解析颜色 ${hex}`);
  return [
    Number.parseInt(match[1], 16) / 255,
    Number.parseInt(match[2], 16) / 255,
    Number.parseInt(match[3], 16) / 255,
    1,
  ];
}

export async function createUniformTriangle(
  canvas: HTMLCanvasElement,
  initialValues: UniformTriangleValues,
  signal: AbortSignal,
): Promise<UniformTriangleSession> {
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
  let uniformBuffer: GPUBuffer | null = null;

  try {
    throwIfAborted(signal);
    contextOwner = configureCanvasContext(canvas, context, device, format);
    const module = device.createShaderModule({
      label: 'Uniform 实验 WGSL 模块',
      code: UNIFORM_TRIANGLE_WGSL,
    });
    const compilationError = compilationErrorMessage(await module.getCompilationInfo());
    throwIfAborted(signal);
    if (compilationError) throw new Error(compilationError);

    const pipeline = await device.createRenderPipelineAsync({
      label: 'Uniform 实验渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
    });
    throwIfAborted(signal);

    const createdUniformBuffer = device.createBuffer({
      label: 'Uniform 实验参数 Buffer',
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    uniformBuffer = createdUniformBuffer;
    const bindGroup = device.createBindGroup({
      label: 'Uniform 实验 Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: createdUniformBuffer } }],
    });

    let values = initialValues;
    let disposed = false;
    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: 'Uniform 实验命令编码器' });
      const pass = encoder.beginRenderPass({
        label: 'Uniform 实验 Render Pass',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    const update = (nextValues: UniformTriangleValues) => {
      if (disposed) return;
      values = nextValues;
      device.queue.writeBuffer(createdUniformBuffer, 0, packUniformValues(values));
      render();
    };

    update(initialValues);

    return {
      update,
      render,
      lost: device.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        uniformBuffer?.destroy();
        releaseCanvasContext(canvas, context, contextOwner);
        contextOwner = null;
        device.destroy();
      },
    };
  } catch (error) {
    uniformBuffer?.destroy();
    releaseCanvasContext(canvas, context, contextOwner);
    device.destroy();
    throw error;
  }
}
