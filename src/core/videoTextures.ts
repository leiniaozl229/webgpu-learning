import { resizeCanvasToDisplaySize, throwIfAborted } from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const VIDEO_TEXTURE_WGSL = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  let positions = array(
    vec2f(-0.92, -0.78), vec2f( 0.92, -0.78), vec2f(-0.92,  0.78),
    vec2f(-0.92,  0.78), vec2f( 0.92, -0.78), vec2f( 0.92,  0.78),
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

@group(0) @binding(0) var videoSampler: sampler;
@group(0) @binding(1) var videoTexture: texture_external;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSampleBaseClampToEdge(videoTexture, videoSampler, input.uv);
}`;

export interface VideoTextureSession {
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export async function createVideoTextureSession(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<VideoTextureSession> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    throw new Error('HTMLVideoElement 尚未提供可导入的视频帧。');
  }

  const runtime = await createTextureRuntime(canvas, signal);
  const { device, context, format } = runtime;
  try {
    const module = await createCheckedShaderModule(
      device,
      VIDEO_TEXTURE_WGSL,
      'External Video Texture WGSL 模块',
      signal,
    );
    const pipeline = await device.createRenderPipelineAsync({
      label: 'External Video Texture 渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
    });
    throwIfAborted(signal);
    const sampler = device.createSampler({
      label: 'External Video Texture sampler',
      magFilter: 'linear',
      minFilter: 'linear',
    });

    let disposed = false;
    const render = () => {
      if (disposed || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);

      const externalTexture = device.importExternalTexture({
        label: '当前 HTMLVideoElement 帧',
        source: video,
      });
      const bindGroup = device.createBindGroup({
        label: '当前视频帧 Bind Group',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: externalTexture },
        ],
      });

      const encoder = device.createCommandEncoder({ label: '视频纹理命令编码器' });
      const pass = encoder.beginRenderPass({
        label: '视频纹理 Render Pass',
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

    return {
      render,
      lost: runtime.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        runtime.dispose();
      },
    };
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}
