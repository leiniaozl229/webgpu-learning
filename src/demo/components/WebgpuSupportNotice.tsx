import { CheckCircle2, CircleAlert, Cpu } from 'lucide-react';
import { useEffect, useState } from 'react';

type SupportState = 'checking' | 'supported' | 'unsupported' | 'insecure';

export function WebgpuSupportNotice() {
  const [state, setState] = useState<SupportState>('checking');

  useEffect(() => {
    setState(window.isSecureContext ? (navigator.gpu ? 'supported' : 'unsupported') : 'insecure');
  }, []);

  const title = state === 'checking'
    ? '正在检查 WebGPU'
    : state === 'supported'
      ? '浏览器已暴露 WebGPU'
      : state === 'insecure'
        ? '当前页面缺少安全上下文'
        : '当前浏览器未暴露 WebGPU';

  return (
    <aside className="webgpu-support" data-state={state} aria-live="polite">
      <span aria-hidden="true">
        {state === 'checking' ? <Cpu /> : state === 'supported' ? <CheckCircle2 /> : <CircleAlert />}
      </span>
      <div>
        <strong>{title}</strong>
        <p>
          {state === 'supported'
            ? '下面的实验会继续请求 GPUAdapter 与 GPUDevice，并把真实结果绘制到 Canvas。'
            : state === 'insecure'
              ? 'WebGPU 只在安全上下文中开放。请使用 HTTPS，或通过 localhost / 127.0.0.1 运行本地项目。'
              : state === 'unsupported'
              ? '正文和源码仍可阅读；运行实验需要支持 WebGPU 的新版浏览器与可用图形环境。'
              : '能力结果会在页面加载后立即显示。'}
        </p>
      </div>
    </aside>
  );
}
