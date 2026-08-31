import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createUniformTriangle,
  hexToRgba,
  type UniformTriangleSession,
  UNIFORM_TRIANGLE_WGSL,
} from '../../core/uniforms';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

const DEFAULT_COLOR = '#3494f4';
const DEFAULT_OFFSET = 0;
const DEFAULT_SCALE = 1;

export function UniformPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<UniformTriangleSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [offsetX, setOffsetX] = useState(DEFAULT_OFFSET);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [status, setStatus] = useState('正在创建 Uniform Buffer…');
  const [error, setError] = useState<string | null>(null);

  const values = useMemo(() => ({
    color: hexToRgba(color),
    offset: [offsetX, 0] as const,
    scale: [scale, scale] as const,
  }), [color, offsetX, scale]);
  const latestValuesRef = useRef(values);
  latestValuesRef.current = values;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    void createUniformTriangle(canvas, values, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.update(latestValuesRef.current);
        setStatus('已写入 32 字节 · Bind Group 0 / Binding 0');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          session.dispose();
          if (sessionRef.current === session) sessionRef.current = null;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('Uniform 实验未能运行');
      });

    const stopObserving = observeCanvasResize(canvas, () => {
      try {
        sessionRef.current?.render();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    });
    return () => {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      stopObserving();
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      sessionRef.current?.update(values);
      if (sessionRef.current) setStatus('queue.writeBuffer() 已更新 32 字节');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [values]);

  function reset() {
    setColor(DEFAULT_COLOR);
    setOffsetX(DEFAULT_OFFSET);
    setScale(DEFAULT_SCALE);
  }

  return (
    <section className="uniform-lab" aria-labelledby="uniform-lab-title">
      <header>
        <div><SlidersHorizontal aria-hidden="true" /><div><strong id="uniform-lab-title">Uniform Bind Group 实验</strong><small>一个 Buffer 同时驱动顶点与片段阶段</small></div></div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>修改控件时，JavaScript 会把同一份 32 字节数据写入 <code>GPUBuffer</code>，随后重新提交绘制命令。</p>
          <label>
            <span>color</span>
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="三角形颜色" />
            <code>vec4f</code>
          </label>
          <label className="uniform-slider">
            <span>offset.x</span>
            <input type="range" min="-0.55" max="0.55" step="0.01" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
            <output>{offsetX.toFixed(2)}</output>
          </label>
          <label className="uniform-slider">
            <span>scale</span>
            <input type="range" min="0.35" max="1.35" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            <output>{scale.toFixed(2)}</output>
          </label>
          <small>布局：color 0–15 字节 · offset 16–23 · scale 24–31</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="由 Uniform 控制位置、缩放和颜色的 WebGPU 三角形">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>@group(0) @binding(0)</span>
        </div>
      </div>
      <div className="uniform-lab__sources">
        <div className="uniform-lab__code"><HighlightedCode code={UNIFORM_TRIANGLE_WGSL} language="wgsl" /></div>
      </div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
