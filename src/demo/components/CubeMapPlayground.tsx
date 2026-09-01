import { Box, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CUBE_MAP_WGSL,
  createCubeMapSession,
  type CubeMapSession,
} from '../../core/cubeMaps';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

export function CubeMapPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<CubeMapSession | null>(null);
  const requestIdRef = useRef(0);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [status, setStatus] = useState('正在上传 6 个 Cube Map array layer…');
  const [error, setError] = useState<string | null>(null);
  const settings = useMemo(() => ({
    yaw: yaw * Math.PI / 180,
    pitch: pitch * Math.PI / 180,
  }), [pitch, yaw]);
  const latestSettingsRef = useRef(settings);
  latestSettingsRef.current = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    void createCubeMapSession(canvas, settings, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.update(latestSettingsRef.current);
        setStatus('6 layers · cube view · textureSample(vec3)');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('Cube Map 实验未能运行');
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
    sessionRef.current?.update(settings);
    if (sessionRef.current) setStatus(`yaw ${yaw}° · pitch ${pitch}° · cube sample`);
  }, [pitch, settings, yaw]);

  return (
    <section className="uniform-lab texture-lab" aria-labelledby="cube-map-lab-title">
      <header>
        <div><Box aria-hidden="true" /><div><strong id="cube-map-lab-title">Cube Map 方向采样实验</strong><small>6 layers + cube view + vec3 direction</small></div></div>
        <button type="button" onClick={() => { setYaw(0); setPitch(0); }}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>拖动视角，Fragment Shader 会旋转 vec3 方向。采样硬件根据方向的主轴自动选择立方体面，并计算该面的二维坐标。</p>
          <label className="uniform-slider"><span>yaw</span><input type="range" min="-180" max="180" step="1" value={yaw} onChange={(event) => setYaw(Number(event.target.value))} /><output>{yaw}°</output></label>
          <label className="uniform-slider"><span>pitch</span><input type="range" min="-60" max="60" step="1" value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /><output>{pitch}°</output></label>
          <small>Texture：size [32, 32, 6] · View：dimension 'cube'</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="按可调方向采样六层 WebGPU 立方体贴图的结果">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>texture_cube&lt;f32&gt;</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={CUBE_MAP_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
