import { resizeCanvasToDisplaySize, throwIfAborted } from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const TEXTURE_WIDTH = 8;
export const TEXTURE_HEIGHT = 8;

export const TEXTURE_QUAD_WGSL = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  let positions = array(
    vec2f(-0.88, -0.82), vec2f( 0.88, -0.82), vec2f(-0.88,  0.82),
    vec2f(-0.88,  0.82), vec2f( 0.88, -0.82), vec2f( 0.88,  0.82),
  );
  let uvs = array(
    vec2f(-0.35,  2.35), vec2f(2.35,  2.35), vec2f(-0.35, -0.35),
    vec2f(-0.35, -0.35), vec2f(2.35,  2.35), vec2f( 2.35, -0.35),
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}

@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var colorTexture: texture_2d<f32>;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(colorTexture, textureSampler, input.uv);
}`;

export interface TextureSamplerSettings {
  addressMode: GPUAddressMode;
  filter: GPUFilterMode;
}

export interface TextureBasicsSession {
  updateSampler: (settings: TextureSamplerSettings) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function createCheckerTextureData(
  width = TEXTURE_WIDTH,
  height = TEXTURE_HEIGHT,
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const palette = [
    [24, 54, 92, 255],
    [61, 169, 252, 255],
    [253, 186, 78, 255],
    [235, 79, 94, 255],
  ] as const;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = palette[(x + y * 3 + (x % 3 === 0 ? 1 : 0)) % palette.length];
      data.set(color, (y * width + x) * 4);
    }
  }
  return data;
}

export async function createTextureBasicsSession(
  canvas: HTMLCanvasElement,
  initialSettings: TextureSamplerSettings,
  signal: AbortSignal,
): Promise<TextureBasicsSession> {
  const runtime = await createTextureRuntime(canvas, signal);
  const { device, context, format } = runtime;
  let texture: GPUTexture | null = null;

  try {
    const module = await createCheckedShaderModule(
      device,
      TEXTURE_QUAD_WGSL,
      '纹理基础 WGSL 模块',
      signal,
    );
    const pipeline = await device.createRenderPipelineAsync({
      label: '纹理基础渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
    });
    throwIfAborted(signal);

    texture = device.createTexture({
      label: '8 × 8 教程颜色纹理',
      size: [TEXTURE_WIDTH, TEXTURE_HEIGHT],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture },
      createCheckerTextureData(),
      { bytesPerRow: TEXTURE_WIDTH * 4 },
      { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT },
    );

    const textureView = texture.createView({ label: '8 × 8 纹理视图' });
    let disposed = false;
    let bindGroup: GPUBindGroup;

    const createSamplerBindGroup = (settings: TextureSamplerSettings) => {
      const sampler = device.createSampler({
        label: `${settings.addressMode} + ${settings.filter} sampler`,
        addressModeU: settings.addressMode,
        addressModeV: settings.addressMode,
        magFilter: settings.filter,
        minFilter: settings.filter,
      });
      return device.createBindGroup({
        label: '纹理与采样器 Bind Group',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: textureView },
        ],
      });
    };

    bindGroup = createSamplerBindGroup(initialSettings);

    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: '纹理基础命令编码器' });
      const pass = encoder.beginRenderPass({
        label: '纹理基础 Render Pass',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    const updateSampler = (settings: TextureSamplerSettings) => {
      if (disposed) return;
      bindGroup = createSamplerBindGroup(settings);
      render();
    };

    render();
    return {
      updateSampler,
      render,
      lost: runtime.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        texture?.destroy();
        runtime.dispose();
      },
    };
  } catch (error) {
    texture?.destroy();
    runtime.dispose();
    throw error;
  }
}
