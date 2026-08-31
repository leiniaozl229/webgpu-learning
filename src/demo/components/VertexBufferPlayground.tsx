import { Database } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createVertexBufferTriangle,
  readVertexRecord,
  type VertexBufferTriangleSession,
  VERTEX_STRIDE,
} from '../../core/vertexBuffers';
import { observeCanvasResize } from '../../core/webgpu';

export function VertexBufferPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<VertexBufferTriangleSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const [activeVertex, setActiveVertex] = useState(0);
  const [status, setStatus] = useState('正在上传 Vertex Buffer…');
  const [error, setError] = useState<string | null>(null);
  const record = useMemo(() => readVertexRecord(activeVertex), [activeVertex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const requestId = ++requestIdRef.current;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    void createVertexBufferTriangle(canvas, abortController.signal)
      .then((session) => {
        if (requestId !== requestIdRef.current) {
          session.dispose();
          return;
        }
        sessionRef.current = session;
        setStatus('60 字节已上传 · arrayStride 20 · draw(3)');
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
        setStatus('Vertex Buffer 实验未能运行');
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

  const color = `rgb(${record.color.map((value) => Math.round(value * 255)).join(' ')})`;

  return (
    <section className="vertex-buffer-lab" aria-labelledby="vertex-buffer-lab-title">
      <header>
        <span aria-hidden="true"><Database /></span>
        <div><strong id="vertex-buffer-lab-title">交错 Vertex Buffer 检视器</strong><small>3 个顶点 · 每条记录 20 字节</small></div>
      </header>
      <div className="vertex-buffer-lab__body">
        <div className="vertex-buffer-lab__inspector">
          <div className="vertex-buffer-lab__tabs" role="group" aria-label="选择顶点记录">
            {[0, 1, 2].map((index) => (
              <button key={index} type="button" aria-pressed={activeVertex === index} onClick={() => setActiveVertex(index)}>顶点 {index}</button>
            ))}
          </div>
          <dl>
            <div><dt>记录字节</dt><dd>{record.byteStart}–{record.byteEnd}</dd></div>
            <div><dt>@location(0)</dt><dd>position = [{record.position.map((value) => value.toFixed(2)).join(', ')}]</dd></div>
            <div><dt>@location(1)</dt><dd><i style={{ background: color }} aria-hidden="true" />color = [{record.color.map((value) => value.toFixed(2)).join(', ')}]</dd></div>
          </dl>
          <ol className="vertex-byte-grid" aria-label={`顶点 ${activeVertex} 的 ${VERTEX_STRIDE} 个字节`}>
            {Array.from({ length: VERTEX_STRIDE }, (_, byte) => (
              <li key={byte} data-field={byte < 8 ? 'position' : 'color'} title={byte < 8 ? 'position' : 'color'}>{record.byteStart + byte}</li>
            ))}
          </ol>
          <div className="vertex-byte-legend"><span data-field="position">position · 8 字节</span><span data-field="color">color · 12 字节</span></div>
        </div>
        <div className="vertex-buffer-lab__canvas">
          <canvas ref={canvasRef} role="img" aria-label="从交错 Vertex Buffer 绘制的三色 WebGPU 三角形">当前浏览器无法显示 WebGPU Canvas。</canvas>
          <span>slot 0 · float32x2 + float32x3</span>
        </div>
      </div>
      <footer className={error ? 'vertex-buffer-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
