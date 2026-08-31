export const DEFAULT_TRIANGLE_WGSL = `@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> @builtin(position) vec4f {
  let positions = array(
    vec2f( 0.0,  0.62),
    vec2f(-0.58, -0.52),
    vec2f( 0.58, -0.52),
  );
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}

@fragment fn fragmentMain() -> @location(0) vec4f {
  return vec4f(0.20, 0.58, 0.96, 1.0);
}`;

export const INTERSTAGE_TRIANGLE_WGSL = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  let positions = array(
    vec2f( 0.0,  0.62),
    vec2f(-0.58, -0.52),
    vec2f( 0.58, -0.52),
  );
  let colors = array(
    vec4f(0.98, 0.34, 0.28, 1.0),
    vec4f(0.18, 0.72, 0.52, 1.0),
    vec4f(0.20, 0.50, 0.98, 1.0),
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.color = colors[vertexIndex];
  return output;
}

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return input.color;
}`;

export const TRIANGLE_SETUP_SOURCE = `const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('没有可用的 GPUAdapter');

const device = await adapter.requestDevice();
const context = canvas.getContext('webgpu');
if (!context) throw new Error('无法创建 GPUCanvasContext');

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({ device, format, alphaMode: 'premultiplied' });`;

export interface WebgpuTriangleSession {
  adapterInfo: string;
  format: GPUTextureFormat;
  render: () => void;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

const canvasContextOwners = new WeakMap<HTMLCanvasElement, symbol>();

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException('WebGPU 初始化已取消。', 'AbortError');
}

export function configureCanvasContext(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  device: GPUDevice,
  format: GPUTextureFormat,
): symbol {
  const owner = Symbol('GPUCanvasContext owner');
  context.configure({ device, format, alphaMode: 'premultiplied' });
  canvasContextOwners.set(canvas, owner);
  return owner;
}

export function releaseCanvasContext(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  owner: symbol | null,
): void {
  if (!owner || canvasContextOwners.get(canvas) !== owner) return;
  context.unconfigure();
  canvasContextOwners.delete(canvas);
}

export function resizeCanvasToDisplaySize(
  canvas: HTMLCanvasElement,
  maxTextureDimension2D: number,
  pixelRatio = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2),
): boolean {
  const rawWidth = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const rawHeight = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  const scale = Math.min(1, maxTextureDimension2D / rawWidth, maxTextureDimension2D / rawHeight);
  const width = Math.max(1, Math.min(maxTextureDimension2D, Math.round(rawWidth * scale)));
  const height = Math.max(1, Math.min(maxTextureDimension2D, Math.round(rawHeight * scale)));
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

export function observeCanvasResize(
  canvas: HTMLCanvasElement,
  onResize: () => void,
): () => void {
  const target = canvas.parentElement ?? canvas;
  const observer = new ResizeObserver(onResize);
  try {
    observer.observe(target, { box: 'device-pixel-content-box' });
  } catch {
    observer.observe(target);
  }
  window.addEventListener('resize', onResize);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', onResize);
  };
}

export function compilationErrorMessage(info: GPUCompilationInfo): string | null {
  const errors = info.messages.filter((message) => message.type === 'error');
  if (errors.length === 0) return null;
  return errors
    .map((message) => {
      const location = message.lineNum > 0 ? `第 ${message.lineNum}:${message.linePos} 行` : 'WGSL';
      return `${location} · ${message.message}`;
    })
    .join('\n');
}

export async function createWebgpuTriangle(
  canvas: HTMLCanvasElement,
  shaderSource: string,
  signal: AbortSignal,
): Promise<WebgpuTriangleSession> {
  throwIfAborted(signal);
  if (!navigator.gpu) {
    throw new Error('当前浏览器没有暴露 WebGPU。请使用支持 WebGPU 的新版浏览器。');
  }

  const adapter = await navigator.gpu.requestAdapter();
  throwIfAborted(signal);
  if (!adapter) {
    throw new Error('浏览器支持 WebGPU，但当前环境没有可用的 GPUAdapter。');
  }

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

  try {
    throwIfAborted(signal);
    contextOwner = configureCanvasContext(canvas, context, device, format);
    const shaderModule = device.createShaderModule({
      label: '教程三角形 WGSL 模块',
      code: shaderSource,
    });
    const compilationInfo = await shaderModule.getCompilationInfo();
    throwIfAborted(signal);
    const compilationError = compilationErrorMessage(compilationInfo);
    if (compilationError) throw new Error(compilationError);

    const pipeline = await device.createRenderPipelineAsync({
      label: '教程三角形渲染管线',
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    });
    throwIfAborted(signal);

    let disposed = false;
    const render = () => {
      if (disposed) return;
      resizeCanvasToDisplaySize(canvas, device.limits.maxTextureDimension2D);
      const encoder = device.createCommandEncoder({ label: '教程三角形命令编码器' });
      const pass = encoder.beginRenderPass({
        label: '教程三角形 Render Pass',
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });
      pass.setPipeline(pipeline);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    render();

    const adapterInfo = [adapter.info.vendor, adapter.info.architecture]
      .filter(Boolean)
      .join(' · ') || '默认适配器';

    return {
      adapterInfo,
      format,
      render,
      lost: device.lost,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        releaseCanvasContext(canvas, context, contextOwner);
        contextOwner = null;
        device.destroy();
      },
    };
  } catch (error) {
    releaseCanvasContext(canvas, context, contextOwner);
    device.destroy();
    throw error;
  }
}
