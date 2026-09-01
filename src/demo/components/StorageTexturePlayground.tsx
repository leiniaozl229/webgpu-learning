import { Cpu, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  createStorageTextureSession,
  STORAGE_TEXTURE_COMPUTE_WGSL,
  type StorageTextureSession,
} from '../../core/storageTextures';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

export function StorageTexturePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<StorageTextureSession | null>(null);
  const requestIdRef = useRef(0);
  const latestPhaseRef = useRef(0);
  const [phase, setPhase] = useState(0);
  const [status, setStatus] = useState('正在创建 256 × 256 Storage Texture…');
  const [error, setError] = useState<string | null>(null);
  latestPhaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    void createStorageTextureSession(canvas, phase, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.update(latestPhaseRef.current);
        setStatus('dispatchWorkgroups(32, 32) · draw(6)');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('Storage Texture 实验未能运行');
      });
    const stopObserving = observeCanvasResize(canvas, () => sessionRef.current?.render());
    return () => {
      requestIdRef.current += 1;
      abortController.abort();
      stopObserving();
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.update(phase);
    if (sessionRef.current) setStatus(`phase ${phase.toFixed(2)} · Compute → Texture → Render`);
  }, [phase]);

  return (
    <section className="uniform-lab texture-lab" aria-labelledby="storage-texture-lab-title">
      <header>
        <div><Cpu aria-hidden="true" /><div><strong id="storage-texture-lab-title">Compute 写入 Storage Texture</strong><small>1024 workgroups + one Render Pass</small></div></div>
        <button type="button" onClick={() => setPhase(0)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>拖动 phase 后，Compute Shader 为 65,536 个 texel 重新计算颜色；后续 Render Pass 立即采样同一 Texture View。</p>
          <label className="uniform-slider"><span>phase</span><input type="range" min="0" max="6.28" step="0.02" value={phase} onChange={(event) => setPhase(Number(event.target.value))} /><output>{phase.toFixed(2)}</output></label>
          <small>Texture：STORAGE_BINDING | TEXTURE_BINDING<br />Workgroup：8 × 8 · Dispatch：32 × 32</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="Compute Shader 写入 Storage Texture 后采样到 Canvas 的动态图案">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>textureStore → textureSample</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={STORAGE_TEXTURE_COMPUTE_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
