import { CirclePause, CirclePlay, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  createVideoTextureSession,
  type VideoTextureSession,
  VIDEO_TEXTURE_WGSL,
} from '../../core/videoTextures';
import { observeCanvasResize } from '../../core/webgpu';
import { HighlightedCode } from './HighlightedCode';

function paintSourceFrame(canvas: HTMLCanvasElement, time: number) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建视频源的 2D Canvas Context。');
  const { width, height } = canvas;
  const seconds = time / 1000;
  context.fillStyle = '#0f1724';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#183a58';
  for (let x = 0; x < width; x += 48) context.fillRect(x, 0, 2, height);
  for (let y = 0; y < height; y += 48) context.fillRect(0, y, width, 2);

  const x = width * (0.5 + Math.sin(seconds * 1.4) * 0.32);
  const y = height * (0.5 + Math.cos(seconds * 1.1) * 0.24);
  context.fillStyle = '#4aa8f4';
  context.beginPath();
  context.arc(x, y, 44, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#f4b847';
  context.fillRect(width - x - 36, height - y - 36, 72, 72);

  context.fillStyle = '#e6f2fa';
  context.font = '700 28px system-ui, sans-serif';
  context.fillText('LIVE VIDEO FRAME', 28, 46);
  context.fillStyle = '#9eb8c9';
  context.font = '18px monospace';
  context.fillText(`${seconds.toFixed(2)} s`, 30, height - 28);
}

function waitForCurrentFrame(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadeddata', ready);
      signal.removeEventListener('abort', abort);
    };
    const ready = () => {
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('视频初始化已取消。', 'AbortError'));
    };
    video.addEventListener('loadeddata', ready, { once: true });
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function VideoTexturePlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<VideoTextureSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('点击启动，创建本地视频流与 External Texture');
  const [error, setError] = useState<string | null>(null);

  function stopLoop() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  function startLoop() {
    stopLoop();
    let renderedFrames = 0;
    const frame = (time: number) => {
      const sourceCanvas = sourceCanvasRef.current;
      if (!sourceCanvas || !sessionRef.current) return;
      paintSourceFrame(sourceCanvas, time);
      sessionRef.current.render();
      renderedFrames += 1;
      if (renderedFrames % 30 === 0) setStatus(`已逐帧导入 ${renderedFrames} 次 GPUExternalTexture`);
      frameRef.current = requestAnimationFrame(frame);
    };
    frameRef.current = requestAnimationFrame(frame);
  }

  async function start() {
    const outputCanvas = canvasRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    const video = videoRef.current;
    if (!outputCanvas || !sourceCanvas || !video) return;

    if (sessionRef.current) {
      await video.play();
      setRunning(true);
      setError(null);
      startLoop();
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setStatus('正在创建 Canvas MediaStream 与 GPUDevice…');
    setError(null);
    try {
      paintSourceFrame(sourceCanvas, performance.now());
      const stream = sourceCanvas.captureStream(30);
      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      await waitForCurrentFrame(video, abortController.signal);
      const session = await createVideoTextureSession(outputCanvas, video, abortController.signal);
      if (!mountedRef.current) {
        session.dispose();
        return;
      }
      sessionRef.current = session;
      session.lost.then((info) => {
        if (!mountedRef.current || info.reason === 'destroyed') return;
        setError(`GPUDevice 已丢失：${info.message || info.reason}`);
      }).catch(() => undefined);
      setRunning(true);
      setStatus('texture_external 已连接当前视频帧');
      startLoop();
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('视频纹理实验未能运行');
    }
  }

  function pause() {
    stopLoop();
    videoRef.current?.pause();
    setRunning(false);
    setStatus('已暂停逐帧导入');
  }

  useEffect(() => {
    mountedRef.current = true;
    const canvas = canvasRef.current;
    const stopObserving = canvas
      ? observeCanvasResize(canvas, () => sessionRef.current?.render())
      : () => undefined;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      stopLoop();
      stopObserving();
      sessionRef.current?.dispose();
      sessionRef.current = null;
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.srcObject = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <section className="uniform-lab texture-lab video-texture-lab" aria-labelledby="video-texture-lab-title">
      <header>
        <div><Video aria-hidden="true" /><div><strong id="video-texture-lab-title">GPUExternalTexture 视频实验</strong><small>Canvas stream → video → WebGPU</small></div></div>
        {running ? (
          <button type="button" onClick={pause}><CirclePause aria-hidden="true" /> 暂停</button>
        ) : (
          <button type="button" onClick={() => void start()}><CirclePlay aria-hidden="true" /> 启动</button>
        )}
      </header>
      <div className="uniform-lab__preview">
        <div className="uniform-lab__control">
          <p>示例先把动态图形画入 Canvas，再通过 captureStream 送进 HTMLVideoElement。每帧导入外部纹理，无需复制到常规 GPUTexture。</p>
          <canvas ref={sourceCanvasRef} className="video-source-canvas" width="640" height="400" aria-label="生成视频帧的二维 Canvas" />
          <video ref={videoRef} className="video-source-preview" muted playsInline aria-label="Canvas MediaStream 对应的视频源" />
          <small>外部纹理在当前任务内使用 · 每帧创建 Bind Group</small>
        </div>
        <div className="uniform-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="通过 GPUExternalTexture 采样当前视频帧的 WebGPU 输出">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>importExternalTexture(video)</span>
        </div>
      </div>
      <div className="uniform-lab__sources"><div className="uniform-lab__code"><HighlightedCode code={VIDEO_TEXTURE_WGSL} language="wgsl" /></div></div>
      <footer className={error ? 'uniform-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
