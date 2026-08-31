import { Database, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  createStorageBufferSession,
  MAX_STORAGE_INSTANCES,
  type StorageBufferSession,
  STORAGE_INSTANCE_BYTES,
  STORAGE_INSTANCING_WGSL,
} from '../../core/storageBuffers';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

const DEFAULT_COUNT = 25;

export function StorageBufferPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<StorageBufferSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const latestCountRef = useRef(DEFAULT_COUNT);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [status, setStatus] = useState('正在创建只读 Storage Buffer…');
  const [error, setError] = useState<string | null>(null);
  latestCountRef.current = count;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    void createStorageBufferSession(canvas, DEFAULT_COUNT, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.updateCount(latestCountRef.current);
        setStatus(`一次 draw(3, ${latestCountRef.current}) · ${latestCountRef.current * STORAGE_INSTANCE_BYTES} 字节`);
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
        setStatus('Storage Buffer 实验未能运行');
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
      sessionRef.current?.updateCount(count);
      if (sessionRef.current) setStatus(`一次 draw(3, ${count}) · ${count * STORAGE_INSTANCE_BYTES} 字节`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [count]);

  return (
    <section className="uniform-lab storage-lab" aria-labelledby="storage-lab-title">
      <header>
        <div><Database aria-hidden="true" /><div><strong id="storage-lab-title">Storage Buffer 多实例实验</strong><small>运行时数组 + instance_index</small></div></div>
        <button type="button" onClick={() => setCount(DEFAULT_COUNT)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>每个实例占 32 字节。Vertex Shader 使用 <code>instance_index</code> 从同一个 Storage Buffer 中读取颜色、偏移和缩放。</p>
          <label className="uniform-slider">
            <span>实例数量</span>
            <input type="range" min="1" max={MAX_STORAGE_INSTANCES} step="1" value={count} onChange={(event) => setCount(Number(event.target.value))} />
            <output>{count}</output>
          </label>
          <small>一次 Bind Group · 一次 draw call · {count} 个实例</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="使用只读 Storage Buffer 一次绘制的多个彩色三角形">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>draw(3, {count})</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={STORAGE_INSTANCING_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
