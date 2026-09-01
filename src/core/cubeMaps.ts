import { resizeCanvasToDisplaySize, throwIfAborted } from './webgpu';
import { createCheckedShaderModule, createTextureRuntime } from './textureRuntime';

export const CUBE_FACE_SIZE = 32;
export const CUBE_FACE_LABELS = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'] as const;

export const CUBE_MAP_WGSL = `struct Uniforms {
  yaw: f32,
  pitch: f32,
  aspect: f32,
  padding: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@group(0) @binding(0) var cubeSampler: sampler;
@group(0) @binding(1) var cubeTexture: texture_cube<f32>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

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

fn rotateY(direction: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(
    direction.x * c + direction.z * s,
    direction.y,
    -direction.x * s + direction.z * c,
  );
}

fn rotateX(direction: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(
    direction.x,
    direction.y * c - direction.z * s,
    direction.y * s + direction.z * c,
  );
}

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let screen = vec2f(
    (input.uv.x * 2.0 - 1.0) * uniforms.aspect,
    1.0 - input.uv.y * 2.0,
  );
  var direction = normalize(vec3f(screen, 1.0));
  direction = rotateX(rotateY(direction, uniforms.yaw), uniforms.pitch);
  return textureSample(cubeTexture, cubeSampler, direction);
}`;

export interface CubeMapSettings {
  yaw: number;
  pitch: number;
}

export interface CubeMapSession {
  update: (settings: CubeMapSettings) => void;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export function createCubeFaceData(size = CUBE_FACE_SIZE): Uint8Array[] {
  const colors = [
    [235, 79, 94],
    [111, 224, 176],
    [244, 184, 71],
    [154, 115, 238],
    [74, 168, 244],
    [232, 113, 187],
  ] as const;

  return colors.map((base, faceIndex) => {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const border = x < 2 || y < 2 || x >= size - 2 || y >= size - 2;
        const cross = Math.abs(x - size / 2) < 2 || Math.abs(y - size / 2) < 2;
        const factor = border ? 0.45 : cross ? 1.18 : 0.82 + ((x + y + faceIndex) % 5) * 0.035;
        const offset = (y * size + x) * 4;
        data[offset] = Math.min(255, Math.round(base[0] * factor));
        data[offset + 1] = Math.min(255, Math.round(base[1] * factor));
        data[offset + 2] = Math.min(255, Math.round(base[2] * factor));
        data[offset + 3] = 255;
      }
    }
    return data;
  });
}

export async function createCubeMapSession(
  canvas: HTMLCanvasElement,
  initialSettings: CubeMapSettings,
  signal: AbortSignal,
): Promise<CubeMapSession> {
  const runtime = await createTextureRuntime(canvas, signal);
  const { device, context, format } = runtime;
  let cubeTexture: GPUTexture | null = null;
  let uniformBuffer: GPUBuffer | null = null;

  try {
    const module = await createCheckedShaderModule(device, CUBE_MAP_WGSL, 'Cube Map WGSL 模块', signal);
    const pipeline = await device.createRenderPipelineAsync({
      label: 'Cube Map 渲染管线',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: { module, entryPoint: 'fragmentMain', targets: [{ format }] },
    });
    throwIfAborted(signal);

    cubeTexture = device.createTexture({
      label: '六层 Cube Map Texture',
      size: [CUBE_FACE_SIZE, CUBE_FACE_SIZE, 6],
      dimension: '2d',
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    createCubeFaceData().forEach((data, faceIndex) => {
      device.queue.writeTexture(
        { texture: cubeTexture!, origin: { x: 0, y: 0, z: faceIndex } },
        data,
        { bytesPerRow: CUBE_FACE_SIZE * 4 },
        { width: CUBE_FACE_SIZE, height: CUBE_FACE_SIZE, depthOrArrayLayers: 1 },
      );
    });

    uniformBuffer = device.createBuffer({
      label: 'Cube Map 相机 Uniform Buffer',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const sampler = device.createSampler({
      label: 'Cube Map linear sampler',
      magFilter: 'linear',
      minFilter: 'linear',
    });
    const bindGroup = device.createBindGroup({
      label: 'Cube Map Bind Group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: cubeTexture.createView({ dimension: 'cube' }) },
        { binding: 2, resource: { buffer: uniformBuffer } },
      ],
    });

    let settings = initialSettings;
    let disposed = false;
    const render = () => {
      if (disposed || !uniformBuffer) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
        settings.yaw,
        settings.pitch,
        canvas.width / Math.max(1, canvas.height),
        0,
      ]));

      const encoder = device.createCommandEncoder({ label: 'Cube Map 命令编码器' });
      const pass = encoder.beginRenderPass({
        label: 'Cube Map Render Pass',
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

    const update = (nextSettings: CubeMapSettings) => {
      settings = nextSettings;
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
        uniformBuffer?.destroy();
        cubeTexture?.destroy();
        runtime.dispose();
      },
    };
  } catch (error) {
    uniformBuffer?.destroy();
    cubeTexture?.destroy();
    runtime.dispose();
    throw error;
  }
}
