export {};

const shaderSource = /* wgsl */ `
@vertex fn vertexMain(
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
}
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`页面缺少 ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#webgpu-canvas');
const status = requireElement<HTMLPreElement>('#status');

function resizeCanvas(device: GPUDevice) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const maxSize = device.limits.maxTextureDimension2D;
  const rawWidth = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
  const rawHeight = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
  const scale = Math.min(1, maxSize / rawWidth, maxSize / rawHeight);
  canvas.width = Math.max(1, Math.round(rawWidth * scale));
  canvas.height = Math.max(1, Math.round(rawHeight * scale));
}

async function startTriangle(): Promise<() => void> {
  if (!navigator.gpu) {
    throw new Error('当前浏览器没有暴露 WebGPU，请确认安全上下文与浏览器支持');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('没有可用的 GPUAdapter');

  const device = await adapter.requestDevice();
  device.lost.then((info) => {
    if (info.reason !== 'destroyed') {
      status.textContent = `GPUDevice 已丢失：${info.message || info.reason}`;
    }
  }).catch(() => undefined);

  const canvasContext = canvas.getContext('webgpu');
  if (!canvasContext) {
    device.destroy();
    throw new Error('Canvas 无法创建 GPUCanvasContext');
  }
  const context = canvasContext;

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  try {
    const module = device.createShaderModule({
      label: '第一章三角形 Shader Module',
      code: shaderSource,
    });
    const compilationInfo = await module.getCompilationInfo();
    const errors = compilationInfo.messages.filter((message) => message.type === 'error');
    if (errors.length > 0) {
      throw new Error(errors.map((message) => {
        const location = message.lineNum > 0
          ? `第 ${message.lineNum}:${message.linePos} 行`
          : 'WGSL';
        return `${location} · ${message.message}`;
      }).join('\n'));
    }

    const pipeline = await device.createRenderPipelineAsync({
      label: '第一章三角形 Render Pipeline',
      layout: 'auto',
      vertex: { module, entryPoint: 'vertexMain' },
      fragment: {
        module,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: { topology: 'triangle-list' },
    });

    let disposed = false;
    function render() {
      if (disposed) return;
      resizeCanvas(device);

      const encoder = device.createCommandEncoder({
        label: '第一章三角形 Command Encoder',
      });
      const pass = encoder.beginRenderPass({
        label: '第一章三角形 Render Pass',
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
      status.textContent = `已提交 draw(3) · ${canvas.width}×${canvas.height}`;
    }

    const observer = new ResizeObserver(render);
    try {
      observer.observe(canvas, { box: 'device-pixel-content-box' });
    } catch {
      observer.observe(canvas);
    }
    window.addEventListener('resize', render);
    render();

    return () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      window.removeEventListener('resize', render);
      context.unconfigure();
      device.destroy();
    };
  } catch (error) {
    context.unconfigure();
    device.destroy();
    throw error;
  }
}

let dispose: (() => void) | undefined;
startTriangle()
  .then((cleanup) => { dispose = cleanup; })
  .catch((error: unknown) => {
    status.textContent = error instanceof Error ? error.message : String(error);
  });

window.addEventListener('beforeunload', () => dispose?.(), { once: true });
