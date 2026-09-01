import { Image as ImageIcon, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  createImageTextureSession,
  type ImageTextureSession,
  IMAGE_TEXTURE_WGSL,
  loadImageBitmap,
} from '../../core/imageTextures';
import { observeCanvasResize } from '../../core/webgpu';
import texturePosterUrl from '../assets/texture-poster.svg?url';
import { HighlightedCode } from './HighlightedCode';

export function ImageTexturePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<ImageTextureSession | null>(null);
  const requestIdRef = useRef(0);
  const latestFlipYRef = useRef(false);
  const [flipY, setFlipY] = useState(false);
  const [status, setStatus] = useState('正在 fetch 并解码 SVG 图像…');
  const [error, setError] = useState<string | null>(null);
  latestFlipYRef.current = flipY;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();

    void loadImageBitmap(texturePosterUrl, abortController.signal)
      .then((bitmap) => createImageTextureSession(canvas, bitmap, latestFlipYRef.current, abortController.signal))
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        session.setFlipY(latestFlipYRef.current);
        setStatus('ImageBitmap 640 × 400 · copyExternalImageToTexture');
        session.lost.then((info) => {
          if (requestId !== requestIdRef.current || info.reason === 'destroyed') return;
          setError(`GPUDevice 已丢失：${info.message || info.reason}`);
        }).catch(() => undefined);
      })
      .catch((cause) => {
        if (requestId !== requestIdRef.current) return;
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('图像纹理实验未能运行');
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
    sessionRef.current?.setFlipY(flipY);
    if (sessionRef.current) setStatus(`copyExternalImageToTexture · flipY: ${flipY}`);
  }, [flipY]);

  return (
    <section className="uniform-lab texture-lab" aria-labelledby="image-texture-lab-title">
      <header>
        <div><ImageIcon aria-hidden="true" /><div><strong id="image-texture-lab-title">浏览器图像 → GPUTexture</strong><small>fetch + ImageBitmap + external copy</small></div></div>
        <button type="button" onClick={() => setFlipY(false)}><RotateCcw aria-hidden="true" /> 重置</button>
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>左侧预览来自同一个 SVG URL。浏览器先解码为 ImageBitmap，再将像素复制到 rgba8unorm Texture。</p>
          <img className="texture-source-preview" src={texturePosterUrl} alt="即将复制到 GPUTexture 的彩色几何图像" />
          <label className="texture-toggle">
            <span>复制时翻转 Y</span>
            <input type="checkbox" checked={flipY} onChange={(event) => setFlipY(event.target.checked)} />
          </label>
          <small>源：ImageBitmap · 目标：TEXTURE_BINDING | COPY_DST | RENDER_ATTACHMENT</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="从 ImageBitmap 复制并由 WebGPU 绘制的图像纹理">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>copyExternalImageToTexture</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={IMAGE_TEXTURE_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
