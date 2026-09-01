import {
  compilationErrorMessage,
  configureCanvasContext,
  releaseCanvasContext,
  throwIfAborted,
} from './webgpu';

export interface TextureRuntime {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  lost: Promise<GPUDeviceLostInfo>;
  dispose: () => void;
}

export async function createTextureRuntime(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<TextureRuntime> {
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
  let contextOwner: symbol;
  try {
    contextOwner = configureCanvasContext(canvas, context, device, format);
  } catch (error) {
    device.destroy();
    throw error;
  }
  let disposed = false;

  return {
    device,
    context,
    format,
    lost: device.lost,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      releaseCanvasContext(canvas, context, contextOwner);
      device.destroy();
    },
  };
}

export async function createCheckedShaderModule(
  device: GPUDevice,
  code: string,
  label: string,
  signal?: AbortSignal,
): Promise<GPUShaderModule> {
  const module = device.createShaderModule({ label, code });
  const info = await module.getCompilationInfo();
  throwIfAborted(signal);
  const message = compilationErrorMessage(info);
  if (message) throw new Error(message);
  return module;
}
