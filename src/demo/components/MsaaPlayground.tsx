import { ScanLine, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  createMsaaComparisonSession,
  MSAA_WGSL,
  type MsaaComparisonSession,
} from '../../core/msaa';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

export function MsaaPlayground() {
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const msaaCanvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<MsaaComparisonSession | null>(null);
  const requestIdRef = useRef(0);
  const latestAngleRef = useRef(18);
  const [angle, setAngle] = useState(18);
  const [status, setStatus] = useState('正在创建 sampleCount 1 与 4 的 Pipeline…');
  const [error, setError] = useState<string | null>(null);
  latestAngleRef.current = angle;

  useEffect(() => {
    const singleCanvas = singleCanvasRef.current;
    const msaaCanvas = msaaCanvasRef.current;
    if (!singleCanvas || !msaaCanvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    void createMsaaComparisonSession(
      singleCanvas,
      msaaCanvas,
      angle * Math.PI / 180,
      abortController.signal,
    )
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.update(latestAngleRef.current * Math.PI / 180);
        setStatus('左：1 sample · 右：4 samples + resolveTarget');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('MSAA 实验未能运行');
      });
    const stopSingle = observeCanvasResize(singleCanvas, () => sessionRef.current?.render());
    const stopMsaa = observeCanvasResize(msaaCanvas, () => sessionRef.current?.render());
    return () => {
      requestIdRef.current += 1;
      abortController.abort();
      stopSingle();
      stopMsaa();
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.update(angle * Math.PI / 180);
    if (sessionRef.current) setStatus(`线条角度 ${angle}° · resolve 4 → 1`);
  }, [angle]);

  return (
    <section className="uniform-lab texture-lab msaa-lab" aria-labelledby="msaa-lab-title">
      <header>
        <div><ScanLine aria-hidden="true" /><div><strong id="msaa-lab-title">1× 与 4× MSAA 对比</strong><small>相同 Shader · 不同 multisample state</small></div></div>
        <button type="button" onClick={() => setAngle(18)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="msaa-lab__controls">
        <label className="uniform-slider"><span>线条角度</span><input type="range" min="2" max="45" step="1" value={angle} onChange={(event) => setAngle(Number(event.target.value))} /><output>{angle}°</output></label>
      </div>
      <div className="msaa-canvases">
        <figure><figcaption><strong>sampleCount 1</strong><small>直接写入 Canvas Texture</small></figcaption><canvas ref={singleCanvasRef} role="img" aria-label="每像素单样本渲染的细斜线" /></figure>
        <figure><figcaption><strong>sampleCount 4</strong><small>多采样 Texture → resolveTarget</small></figcaption><canvas ref={msaaCanvasRef} role="img" aria-label="四倍多重采样后 resolve 的细斜线" /></figure>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={MSAA_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
