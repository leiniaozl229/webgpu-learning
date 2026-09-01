import { Grid3X3, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createTextureBasicsSession,
  type TextureBasicsSession,
  type TextureSamplerSettings,
  TEXTURE_QUAD_WGSL,
} from '../../core/textures';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

const DEFAULT_ADDRESS_MODE: GPUAddressMode = 'repeat';
const DEFAULT_FILTER: GPUFilterMode = 'nearest';

export function TextureBasicsPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<TextureBasicsSession | null>(null);
  const requestIdRef = useRef(0);
  const [addressMode, setAddressMode] = useState<GPUAddressMode>(DEFAULT_ADDRESS_MODE);
  const [filter, setFilter] = useState<GPUFilterMode>(DEFAULT_FILTER);
  const [status, setStatus] = useState('正在创建 8 × 8 rgba8unorm Texture…');
  const [error, setError] = useState<string | null>(null);
  const settings = useMemo<TextureSamplerSettings>(() => ({ addressMode, filter }), [addressMode, filter]);
  const latestSettingsRef = useRef(settings);
  latestSettingsRef.current = settings;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();

    void createTextureBasicsSession(canvas, settings, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.updateSampler(latestSettingsRef.current);
        setStatus('writeTexture 256 字节 · draw(6)');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('纹理基础实验未能运行');
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
    try {
      sessionRef.current?.updateSampler(settings);
      if (sessionRef.current) setStatus(`${addressMode} · ${filter} · draw(6)`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [addressMode, filter, settings]);

  function reset() {
    setAddressMode(DEFAULT_ADDRESS_MODE);
    setFilter(DEFAULT_FILTER);
  }

  return (
    <section className="uniform-lab texture-lab" aria-labelledby="texture-basics-lab-title">
      <header>
        <div><Grid3X3 aria-hidden="true" /><div><strong id="texture-basics-lab-title">Texture + Sampler 实验</strong><small>8 × 8 texel · UV 超出 0–1</small></div></div>
        <button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>切换寻址与过滤方式。Texture 内容保持不变，页面只创建新的 Sampler 与 Bind Group，然后重新提交绘制。</p>
          <label className="texture-select">
            <span>addressMode</span>
            <select value={addressMode} onChange={(event) => setAddressMode(event.target.value as GPUAddressMode)}>
              <option value="repeat">repeat</option>
              <option value="clamp-to-edge">clamp-to-edge</option>
              <option value="mirror-repeat">mirror-repeat</option>
            </select>
          </label>
          <label className="texture-select">
            <span>filter</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value as GPUFilterMode)}>
              <option value="nearest">nearest</option>
              <option value="linear">linear</option>
            </select>
          </label>
          <small>Texture：TEXTURE_BINDING | COPY_DST<br />Sampler：寻址 + min/mag filter</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="使用可调采样器读取 8 × 8 WebGPU 纹理的四边形">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>textureSample(texture, sampler, uv)</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={TEXTURE_QUAD_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
