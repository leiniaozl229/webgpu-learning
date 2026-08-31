import { ArrowRight, Cpu, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { doubleValuesOnGpu, parseNumberList, type ComputeResult } from '../../core/compute';

const DEFAULT_INPUT = '1, 3, 5, 8';

export function ComputePlayground() {
  const requestIdRef = useRef(0);
  const [source, setSource] = useState(DEFAULT_INPUT);
  const [inputValues, setInputValues] = useState<number[]>([1, 3, 5, 8]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [status, setStatus] = useState('准备提交 Compute Pass');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (input: string) => {
    const requestId = ++requestIdRef.current;
    setBusy(true);
    setError(null);
    setStatus('正在上传 Storage Buffer 并执行 Compute Shader…');
    try {
      const parsed = parseNumberList(input);
      setInputValues(parsed);
      const nextResult = await doubleValuesOnGpu(parsed);
      if (requestId !== requestIdRef.current) return;
      setResult(nextResult);
      setStatus(`完成 · ${nextResult.byteLength} 字节 · ${nextResult.workgroupCount} 个工作组`);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setResult(null);
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus('Compute 实验未能运行');
    } finally {
      if (requestId === requestIdRef.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run(DEFAULT_INPUT);
    return () => {
      requestIdRef.current += 1;
    };
  }, [run]);

  return (
    <section className="compute-lab" aria-labelledby="compute-lab-title">
      <header>
        <div><span aria-hidden="true"><Cpu /></span><div><strong id="compute-lab-title">Storage Buffer 翻倍实验</strong><small>Float32Array → GPU → Readback Buffer</small></div></div>
        <button type="button" disabled={busy} onClick={() => void run(source)}><Play aria-hidden="true" /> {busy ? '计算中' : '运行'}</button>
      </header>
      <div className="compute-lab__body">
        <div className="compute-lab__input">
          <label htmlFor="compute-values">输入有限数字，以逗号或空格分隔</label>
          <div><input id="compute-values" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} /><button type="button" disabled={busy} onClick={() => void run(source)} aria-label="提交计算"><ArrowRight aria-hidden="true" /></button></div>
          <ol className="compute-lab__stages" aria-label="计算与回读阶段">
            <li><span>1</span><strong>queue.writeBuffer</strong><small>CPU → Storage</small></li>
            <li><span>2</span><strong>dispatchWorkgroups</strong><small>Compute Shader</small></li>
            <li><span>3</span><strong>copyBufferToBuffer</strong><small>Storage → Readback</small></li>
            <li><span>4</span><strong>mapAsync + copy</strong><small>Readback → CPU</small></li>
          </ol>
        </div>
        <div className="compute-lab__result">
          <div className="compute-values" aria-label="输入值">
            <strong>输入</strong>
            <ol>{inputValues.map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ol>
          </div>
          <ArrowRight aria-hidden="true" />
          <div className="compute-values compute-values--result" aria-label="GPU 计算结果">
            <strong>GPU × 2</strong>
            {result ? <ol>{result.values.map((value, index) => <li key={`${index}-${value}`}>{value}</li>)}</ol> : <p>等待结果</p>}
          </div>
        </div>
      </div>
      <footer className={error ? 'compute-lab__error' : undefined} aria-live="polite">{error ?? status}</footer>
    </section>
  );
}
