import {
  configureCanvasContext,
  releaseCanvasContext,
  resizeCanvasToDisplaySize,
  throwIfAborted,
} from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const MSAA_WGSL = `struct Uniforms {
  angle: f32,
  padding: vec3f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex fn vertexMain(
  @builtin(vertex_index) index: u32,
) -> @builtin(position) vec4f {
  let positions = array(
    vec2f(-0.82, -0.025),
    vec2f( 0.82, -0.025),
    vec2f( 0.82,  0.025),
    vec2f(-0.82, -0.025),
    vec2f( 0.82,  0.025),
    vec2f(-0.82,  0.025),
  );
  let position = positions[index];
  let c = cos(uniforms.angle);
  let s = sin(uniforms.angle);
  let rotated = vec2f(
    position.x * c - position.y * s,
    position.x * s + position.y * c,
  );
  return vec4f(rotated, 0.0, 1.0);
}

@fragment fn fragmentMain() -> @location(0) vec4f {
  return vec4f(0.22, 0.68, 0.98, 1.0);
}`;

export interface MsaaComparisonSession {
  update: (angle: number) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function isMultisampled(sampleCount: number): boolean {
  return sampleCount > 1;
}

export async function createMsaaComparisonSession(
  singleCanvas: HTMLCanvasElement,
  msaaCanvas: HTMLCanvasElement,
  initialAngle: number,
  signal: AbortSignal,
): Promise<MsaaComparisonSession> {
  const runtime = await createTextureRuntime(singleCanvas, signal);
  const { device, context: singleContext, format } = runtime;
  const msaaContext = msaaCanvas.getContext('webgpu');
  if (!msaaContext) {
    runtime.dispose();
    throw new Error('MSAA Canvas 无法创建 GPUCanvasContext。');
  }

  let msaaContextOwner: symbol | null = null;
  let uniformBuffer: GPUBuffer | null = null;
  let multisampleTexture: GPUTexture | null = null;
  let multisampleWidth = 0;
  let multisampleHeight = 0;
  const destroyMultisampleTexture = () => {
    multisampleTexture?.destroy();
    multisampleTexture = null;
  };

  try {
    throwIfAborted(signal);
    msaaContextOwner = configureCanvasContext(msaaCanvas, msaaContext, device, format);
    const module = await createCheckedShaderModule(device, MSAA_WGSL, 'MSAA 对比 WGSL 模块', signal);
    const createPipeline = (sampleCount: number) => device.createRenderPipelineAsync({
      label: `sampleCount ${sampleCount} 渲染管线`,
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
      multisample: { count: sampleCount },
    });
    const [singlePipeline, msaaPipeline] = await Promise.all([
      createPipeline(1),
      createPipeline(4),
    ]);
    throwIfAborted(signal);

    uniformBuffer = device.createBuffer({
      label: 'MSAA 线条旋转 Uniform Buffer',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const createBindGroup = (pipeline: GPURenderPipeline) => device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer! } }],
    });
    const singleBindGroup = createBindGroup(singlePipeline);
    const msaaBindGroup = createBindGroup(msaaPipeline);

    let angle = initialAngle;
    let disposed = false;
    const ensureMultisampleTexture = () => {
      if (
        multisampleTexture
        && multisampleWidth === msaaCanvas.width
        && multisampleHeight === msaaCanvas.height
      ) return;
      destroyMultisampleTexture();
      multisampleTexture = device.createTexture({
        label: '4× MSAA 临时颜色 Texture',
        size: [msaaCanvas.width, msaaCanvas.height],
        sampleCount: 4,
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      multisampleWidth = msaaCanvas.width;
      multisampleHeight = msaaCanvas.height;
    };

    const encodeCanvas = (
      encoder: GPUCommandEncoder,
      context: GPUCanvasContext,
      pipeline: GPURenderPipeline,
      bindGroup: GPUBindGroup,
      sampleCount: number,
    ) => {
      const currentView = context.getCurrentTexture().createView();
      const multisampled = isMultisampled(sampleCount);
      if (multisampled) ensureMultisampleTexture();
      const pass = encoder.beginRenderPass({
        label: `${sampleCount}× sample Render Pass`,
        colorAttachments: [{
          view: multisampled ? multisampleTexture!.createView() : currentView,
          resolveTarget: multisampled ? currentView : undefined,
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: multisampled ? 'discard' : 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
    };

    const render = () => {
      if (disposed || !uniformBuffer) return;
      resizeCanvasToDisplaySize(singleCanvas, device.limits.maxTextureDimension2D);
      resizeCanvasToDisplaySize(msaaCanvas, device.limits.maxTextureDimension2D);
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([angle, 0, 0, 0]));
      const encoder = device.createCommandEncoder({ label: 'MSAA 对比命令编码器' });
      encodeCanvas(encoder, singleContext, singlePipeline, singleBindGroup, 1);
      encodeCanvas(encoder, msaaContext, msaaPipeline, msaaBindGroup, 4);
      device.queue.submit([encoder.finish()]);
    };

    const update = (nextAngle: number) => {
      angle = nextAngle;
      render();
    };
    render();

    return {
      update,
      render,
      lost: runtime.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        destroyMultisampleTexture();
        uniformBuffer?.destroy();
        releaseCanvasContext(msaaCanvas, msaaContext, msaaContextOwner);
        msaaContextOwner = null;
        runtime.dispose();
      },
    };
  } catch (error) {
    destroyMultisampleTexture();
    uniformBuffer?.destroy();
    releaseCanvasContext(msaaCanvas, msaaContext, msaaContextOwner);
    runtime.dispose();
    throw error;
  }
}
