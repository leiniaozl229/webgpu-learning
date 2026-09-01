import { resizeCanvasToDisplaySize, throwIfAborted } from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const IMAGE_TEXTURE_WGSL = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  let positions = array(
    vec2f(-0.92, -0.75), vec2f( 0.92, -0.75), vec2f(-0.92,  0.75),
    vec2f(-0.92,  0.75), vec2f( 0.92, -0.75), vec2f( 0.92,  0.75),
  );
  let uvs = array(
    vec2f(0.0, 1.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0),
    vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(1.0, 0.0),
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}

@group(0) @binding(0) var imageSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(imageTexture, imageSampler, input.uv);
}`;

export interface ImageTextureSession {
  setFlipY: (flipY: boolean) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export async function loadImageBitmap(
  url: string,
  signal: AbortSignal,
): Promise<ImageBitmap> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`图像请求失败：HTTP ${response.status}`);
  const blob = await response.blob();
  throwIfAborted(signal);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => signal.removeEventListener('abort', abort);
      const abort = () => {
        cleanup();
        image.src = '';
        reject(new DOMException('图像解码已取消。', 'AbortError'));
      };
      signal.addEventListener('abort', abort, { once: true });
      void image.decode().then(() => {
        cleanup();
        resolve();
      }, (error) => {
        cleanup();
        reject(error);
      });
    });
    throwIfAborted(signal);
    return await createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createImageTextureSession(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  initialFlipY: boolean,
  signal: AbortSignal,
): Promise<ImageTextureSession> {
  const runtime = await createTextureRuntime(canvas, signal);
  const { device, context, format } = runtime;
  let texture: GPUTexture | null = null;

  try {
    if (
      bitmap.width > device.limits.maxTextureDimension2D
      || bitmap.height > device.limits.maxTextureDimension2D
    ) {
      throw new Error(`图像 ${bitmap.width} × ${bitmap.height} 超过设备二维纹理限制。`);
    }

    const module = await createCheckedShaderModule(
      device,
      IMAGE_TEXTURE_WGSL,
      '图像纹理 WGSL 模块',
      signal,
    );
    const pipeline = await device.createRenderPipelineAsync({
      label: '图像纹理渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
    });
    throwIfAborted(signal);

    texture = device.createTexture({
      label: `${bitmap.width} × ${bitmap.height} 外部图像纹理`,
      size: [bitmap.width, bitmap.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING
        | GPUTextureUsage.COPY_DST
        | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const sampler = device.createSampler({
      label: '图像纹理 linear sampler',
      magFilter: 'linear',
      minFilter: 'linear',
    });
    const bindGroup = device.createBindGroup({
      label: '图像纹理 Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });

    let disposed = false;
    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: '图像纹理命令编码器' });
      const pass = encoder.beginRenderPass({
        label: '图像纹理 Render Pass',
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

    const setFlipY = (flipY: boolean) => {
      if (disposed || !texture) return;
      device.queue.copyExternalImageToTexture(
        { source: bitmap, flipY },
        { texture },
        { width: bitmap.width, height: bitmap.height },
      );
      render();
    };

    setFlipY(initialFlipY);
    return {
      setFlipY,
      render,
      lost: runtime.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        texture?.destroy();
        bitmap.close();
        runtime.dispose();
      },
    };
  } catch (error) {
    texture?.destroy();
    bitmap.close();
    runtime.dispose();
    throw error;
  }
}
