import { Braces, Cpu, Database, Download } from 'lucide-react';
import type { ReactNode } from 'react';

import { DOUBLE_VALUES_WGSL } from '../../core/compute';
import { CodeBlock } from './CodeBlock';
import { ComputePlayground } from './ComputePlayground';
import { LessonLink } from './LessonLink';

const readbackCode = `encoder.copyBufferToBuffer(
  workBuffer, 0,
  resultBuffer, 0,
  input.byteLength,
);
device.queue.submit([encoder.finish()]);

await resultBuffer.mapAsync(GPUMapMode.READ);
const copied = new Float32Array(
  resultBuffer.getMappedRange().slice(0),
);
resultBuffer.unmap();`;

export function ComputeArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>计算着色器</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>计算着色器基础</h1>
        <p className="lesson-lead">把 Float32Array 送入 Storage Buffer，并行执行数值翻倍，再经过专用 Readback Buffer 安全地复制回 JavaScript。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Compute Shader</li><li>Storage Buffer</li><li>约 28 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="compute-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Cpu /></div>
        <div><h2 id="compute-learn-heading">你将理解</h2><ul><li>workgroup 与 global_invocation_id 如何定位任务</li><li>Storage Buffer 为什么允许 Shader 读写</li><li>计算结果为什么先复制到 MAP_READ Buffer</li><li>映射视图在 unmap 前为什么必须复制</li></ul></div>
      </section>

      <section id="compute-model" className="lesson-section">
        <h2>Compute Shader 处理独立索引</h2>
        <p><code>@compute</code> 声明计算入口，<code>@workgroup_size(64)</code> 表示每个工作组包含 64 次调用。<code>global_invocation_id.x</code> 提供全局索引，Shader 用它访问 Storage Buffer 中对应的 f32。</p>
        <CodeBlock language="wgsl" label="数值翻倍 Compute Shader">{DOUBLE_VALUES_WGSL}</CodeBlock>
      </section>

      <section id="storage-buffer" className="lesson-section">
        <h2>一块工作 Buffer 承担输入与输出</h2>
        <div className="compute-resource-grid">
          <article><Database aria-hidden="true" /><h3>workBuffer</h3><code>STORAGE | COPY_SRC | COPY_DST</code><p>接收 CPU 输入，供 Compute Shader 原地读写，再作为复制源。</p></article>
          <article><Download aria-hidden="true" /><h3>resultBuffer</h3><code>MAP_READ | COPY_DST</code><p>接收 GPU 复制结果，等待 JavaScript 异步映射。</p></article>
          <article><Braces aria-hidden="true" /><h3>Bind Group</h3><code>@group(0) @binding(0)</code><p>让 Compute Pipeline 的 binding 0 指向 workBuffer。</p></article>
        </div>
      </section>

      <section id="compute-lab" className="lesson-section lesson-section--wide">
        <h2>提交真实计算并读取结果</h2>
        <p>输入一组数字。实验会创建 Float32Array，写入 GPU，执行 Compute Pass，复制到 Readback Buffer，再把结果呈现在页面上。每次运行都会释放本次创建的 Buffer 与 Device。</p>
        <ComputePlayground />
      </section>

      <section id="readback" className="lesson-section">
        <h2>映射前先从工作资源复制</h2>
        <p>可供 Shader 使用的 Storage Buffer 不直接映射给 JavaScript。命令编码器先把结果复制到带 <code>MAP_READ</code> 的 Buffer。<code>getMappedRange()</code> 返回的视图会在 <code>unmap()</code> 后失效，因此代码先用 <code>slice(0)</code> 创建独立副本。</p>
        <CodeBlock label="复制、映射并保存结果">{readbackCode}</CodeBlock>
      </section>

      <section id="next-steps" className="next-steps">
        <div><h2>接下来</h2><p>按照当前教程目录，计算着色器的后续案例是图像直方图与图像直方图进阶。</p></div>
      </section>
    </article>
  );
}
