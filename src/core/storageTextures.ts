import { resizeCanvasToDisplaySize, throwIfAborted } from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const STORAGE_TEXTURE_SIZE = 256;
export const STORAGE_TEXTURE_WORKGROUP_SIZE = 8;

export const STORAGE_TEXTURE_COMPUTE_WGSL = `struct Settings {
  phase: f32,
  padding: vec3f,
}

@group(0) @binding(0)
var outputTexture: texture_storage_2d<rgba8unorm, write>;

@group(0) @binding(1)
var<uniform> settings: Settings;

@compute @workgroup_size(8, 8)
fn generate(@builtin(global_invocation_id) id: vec3u) {
  let size = textureDimensions(outputTexture);
  if (id.x >= size.x || id.y >= size.y) {
    return;
  }

  let uv = (vec2f(id.xy) + 0.5) / vec2f(size);
  let rings = 0.5 + 0.5 * sin(length(uv - 0.5) * 48.0 - settings.phase * 6.0);
  let waves = 0.5 + 0.5 * sin((uv.x + uv.y) * 24.0 + settings.phase * 4.0);
  let color = vec3f(
    0.10 + rings * 0.22,
    0.24 + waves * 0.62,
    0.42 + (1.0 - rings) * 0.50,
  );
  textureStore(outputTexture, vec2i(id.xy), vec4f(color, 1.0));
}`;

export const STORAGE_TEXTURE_RENDER_WGSL = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput {
  let positions = array(
    vec2f(-1.0, -1.0), vec2f( 1.0, -1.0), vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0), vec2f( 1.0, -1.0), vec2f( 1.0,  1.0),
  );
  let uv = positions[index] * 0.5 + 0.5;
  var output: VertexOutput;
  output.position = vec4f(positions[index], 0.0, 1.0);
  output.uv = vec2f(uv.x, 1.0 - uv.y);
  return output;
}

@group(0) @binding(0) var outputSampler: sampler;
@group(0) @binding(1) var generatedTexture: texture_2d<f32>;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(generatedTexture, outputSampler, input.uv);
}`;

export interface StorageTextureSession {
  update: (phase: number) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function workgroupCount(
  size: number,
  workgroupSize = STORAGE_TEXTURE_WORKGROUP_SIZE,
): number {
  if (!Number.isFinite(size) || size < 1 || !Number.isFinite(workgroupSize) || workgroupSize < 1) {
    throw new RangeError('纹理尺寸与工作组尺寸必须为正数。');
  }
  return Math.ceil(size / workgroupSize);
}

export async function createStorageTextureSession(
  canvas: HTMLCanvasElement,
  initialPhase: number,
  signal: AbortSignal,
): Promise<StorageTextureSession> {
  const runtime = await createTextureRuntime(canvas, signal);
  const { device, context, format } = runtime;
  let storageTexture: GPUTexture | null = null;
  let settingsBuffer: GPUBuffer | null = null;

  try {
    const computeModule = await createCheckedShaderModule(
      device,
      STORAGE_TEXTURE_COMPUTE_WGSL,
      'Storage Texture Compute WGSL 模块',
      signal,
    );
    const renderModule = await createCheckedShaderModule(
      device,
      STORAGE_TEXTURE_RENDER_WGSL,
      'Storage Texture Render WGSL 模块',
      signal,
    );
    const computePipeline = await device.createComputePipelineAsync({
      label: 'Storage Texture Compute Pipeline',
      layout: 'auto',
      compute: { module: computeModule, entryPoint: 'generate' },
    });
    const renderPipeline = await device.createRenderPipelineAsync({
      label: 'Storage Texture Render Pipeline',
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vertexMain' },
      fragment: { module: renderModule, entryPoint: 'fragmentMain', targets: [{ format }] },
    });
    throwIfAborted(signal);

    storageTexture = device.createTexture({
      label: 'Compute 生成的 rgba8unorm Storage Texture',
      size: [STORAGE_TEXTURE_SIZE, STORAGE_TEXTURE_SIZE],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const textureView = storageTexture.createView();
    settingsBuffer = device.createBuffer({
      label: 'Storage Texture Phase Uniform Buffer',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const computeBindGroup = device.createBindGroup({
      label: 'Storage Texture Compute Bind Group',
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: textureView },
        { binding: 1, resource: { buffer: settingsBuffer } },
      ],
    });
    const renderBindGroup = device.createBindGroup({
      label: 'Storage Texture Render Bind Group',
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
        { binding: 1, resource: textureView },
      ],
    });

    let phase = initialPhase;
    let disposed = false;
    const render = () => {
      if (disposed || !settingsBuffer) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      device.queue.writeBuffer(settingsBuffer, 0, new Float32Array([phase, 0, 0, 0]));

      const encoder = device.createCommandEncoder({ label: 'Storage Texture Compute + Render 编码器' });
      const computePass = encoder.beginComputePass({ label: '写入 Storage Texture' });
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, computeBindGroup);
      computePass.dispatchWorkgroups(
        workgroupCount(STORAGE_TEXTURE_SIZE),
        workgroupCount(STORAGE_TEXTURE_SIZE),
      );
      computePass.end();

      const renderPass = encoder.beginRenderPass({
        label: '采样 Storage Texture',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      renderPass.setPipeline(renderPipeline);
      renderPass.setBindGroup(0, renderBindGroup);
      renderPass.draw(6);
      renderPass.end();
      device.queue.submit([encoder.finish()]);
    };

    const update = (nextPhase: number) => {
      phase = nextPhase;
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
        settingsBuffer?.destroy();
        storageTexture?.destroy();
        runtime.dispose();
      },
    };
  } catch (error) {
    settingsBuffer?.destroy();
    storageTexture?.destroy();
    runtime.dispose();
    throw error;
  }
}
