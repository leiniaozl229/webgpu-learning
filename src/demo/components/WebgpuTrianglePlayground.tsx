import { Tabs } from '@base-ui/react/tabs';
import { Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createWebgpuTriangle,
  DEFAULT_TRIANGLE_WGSL,
  observeCanvasResize,
  TRIANGLE_SETUP_SOURCE,
  type WebgpuTriangleSession,
} from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

interface WebgpuTrianglePlaygroundProps {
  title?: string;
  initialSource?: string;
  canvasLabel?: string;
}

export function WebgpuTrianglePlayground({
  title = '第一个 WebGPU 三角形',
  initialSource = DEFAULT_TRIANGLE_WGSL,
  canvasLabel = 'WebGPU 绘制的蓝色三角形',
}: WebgpuTrianglePlaygroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<WebgpuTriangleSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const highlightedSourceRef = useRef<HTMLPreElement>(null);
  const [shaderSource, setShaderSource] = useState(initialSource);
  const [status, setStatus] = useState('准备请求 GPUDevice');
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (source: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setStatus('正在编译 WGSL 并创建渲染管线…');
    setError(null);
    sessionRef.current?.dispose();
    sessionRef.current = null;

    try {
      const session = await createWebgpuTriangle(canvas, source, abortController.signal);
      if (requestId !== requestIdRef.current) {
        session.dispose();
        return;
      }
      sessionRef.current = session;
      setStatus(`已提交 draw(3) · ${session.format} · ${session.adapterInfo}`);
      session.lost.then((info) => {
        if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
        session.dispose();
        if (sessionRef.current === session) sessionRef.current = null;
        setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        setStatus('实验设备已丢失');
      }).catch(() => undefined);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('实验未能运行');
    }
  }, []);

  useEffect(() => {
    void run(initialSource);
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [initialSource, run]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return observeCanvasResize(canvas, () => {
      try {
        sessionRef.current?.render();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    });
  }, []);

  function reset() {
    setShaderSource(initialSource);
    void run(initialSource);
  }

  return (
    <section className="code-workbench playground webgpu-playground" aria-labelledby="webgpu-playground-title">
      <div className="code-workbench__header playground__header">
        <div className="code-workbench__heading">
          <span className="playground__status-dot" aria-hidden="true" />
          <strong id="webgpu-playground-title">{title}</strong>
          <small>TypeScript + WGSL</small>
        </div>
        <div className="playground__actions">
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
          <button className="run-button" type="button" onClick={() => void run(shaderSource)}>
            <Play aria-hidden="true" /> 运行
          </button>
        </div>
      </div>
      <div className="playground__body">
        <Tabs.Root className="editor-panel" defaultValue="wgsl">
          <Tabs.List className="editor-tabs" aria-label="WebGPU 三角形源码">
            <Tabs.Tab value="setup">webgpu.ts</Tabs.Tab>
            <Tabs.Tab value="wgsl">triangle.wgsl</Tabs.Tab>
            <Tabs.Indicator className="editor-tabs__indicator" />
          </Tabs.List>
          <Tabs.Panel className="vertex-data-panel" value="setup">
            <HighlightedCode code={TRIANGLE_SETUP_SOURCE} language="typescript" />
          </Tabs.Panel>
          <Tabs.Panel className="shader-source-panel" value="wgsl">
            <label className="sr-only" htmlFor="wgsl-editor">WGSL 着色器源码</label>
            <HighlightedCode
              ref={highlightedSourceRef}
              className="shader-source-highlight"
              code={shaderSource}
              language="wgsl"
              ariaHidden
            />
            <textarea
              id="wgsl-editor"
              value={shaderSource}
              spellCheck={false}
              onScroll={(event) => {
                if (!highlightedSourceRef.current) return;
                highlightedSourceRef.current.scrollTop = event.currentTarget.scrollTop;
                highlightedSourceRef.current.scrollLeft = event.currentTarget.scrollLeft;
              }}
              onChange={(event) => setShaderSource(event.target.value)}
            />
          </Tabs.Panel>
        </Tabs.Root>
        <div className="result-panel">
          <canvas ref={canvasRef} role="img" aria-label={canvasLabel}>当前浏览器无法显示 WebGPU Canvas。</canvas>
          <div className="result-panel__meta" aria-hidden="true"><span>GPUCanvasContext</span><span>draw(3)</span></div>
        </div>
      </div>
      <footer className={`playground__footer${error ? ' playground__footer--error' : ''}`} aria-live="polite">
        {error ? <pre>{error}</pre> : status}
      </footer>
    </section>
  );
}
