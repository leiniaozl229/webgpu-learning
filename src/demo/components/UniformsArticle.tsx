import { ArrowLeft, ArrowRight, Boxes, Database, Link2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { UniformPlayground } from './UniformPlayground';

const bindGroupCode = `const uniformBuffer = device.createBuffer({
  label: 'uniform values',
  size: 32,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
});

device.queue.writeBuffer(uniformBuffer, 0, packedValues);`;

export function UniformsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>Uniforms</h1>
        <p className="lesson-lead">把一次绘制共享的小块参数打包进 GPUBuffer，并通过 Bind Group 对接 WGSL 的 group 与 binding。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Uniform Buffer</li><li>Bind Group</li><li>约 24 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="uniform-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Boxes /></div>
        <div><h2 id="uniform-learn-heading">你将理解</h2><ul><li>Uniform 适合承载哪些跨调用共享参数</li><li>Bind Group 如何把具体 Buffer 接到 WGSL binding</li><li>Buffer usage 为什么要同时包含 UNIFORM 与 COPY_DST</li><li>WGSL 对齐规则怎样决定 32 字节内存布局</li></ul></div>
      </section>

      <section id="binding-model" className="lesson-section">
        <h2>Shader 声明位置，Bind Group 提供资源</h2>
        <div className="binding-grid">
          <article><Database aria-hidden="true" /><h3>GPUBuffer</h3><code>UNIFORM | COPY_DST</code><p>保存颜色、偏移和缩放的 32 字节数据。</p></article>
          <article><Link2 aria-hidden="true" /><h3>Bind Group</h3><code>group 0 · binding 0</code><p>把具体 Buffer 与 Pipeline 推导出的布局关联起来。</p></article>
          <article><Boxes aria-hidden="true" /><h3>WGSL variable</h3><code>var&lt;uniform&gt;</code><p>顶点和片段阶段都可读取同一份只读参数。</p></article>
        </div>
        <CodeBlock label="创建 Uniform Buffer 与 Bind Group">{bindGroupCode}</CodeBlock>
      </section>

      <section id="memory-layout" className="lesson-section">
        <h2>对齐规则决定字节位置</h2>
        <p>实验使用一个 <code>vec4f</code> 和两个 <code>vec2f</code>。color 占 0–15 字节，offset 占 16–23，scale 占 24–31，总计 32 字节。JavaScript 按完全相同的顺序创建八个 <code>f32</code>。</p>
        <div className="uniform-byte-map" role="img" aria-label="32 字节 Uniform Buffer 的字段布局"><span data-field="color">color · 16B</span><span data-field="offset">offset · 8B</span><span data-field="scale">scale · 8B</span></div>
      </section>

      <section id="uniform-lab" className="lesson-section lesson-section--wide">
        <h2>用一份 Buffer 驱动两个阶段</h2>
        <p>拖动 offset 与 scale 会改变 Vertex Shader 的位置计算；颜色由 Fragment Shader 读取。每次交互只更新 Buffer 内容，Pipeline 与 Bind Group 可以继续复用。</p>
        <UniformPlayground />
      </section>

      <section id="update-path" className="lesson-section">
        <h2>小块频繁数据走 queue.writeBuffer</h2>
        <p>Uniform 数据量通常较小，<code>queue.writeBuffer()</code> 能直接安排一次 CPU 到 GPU 的复制。Buffer 创建时加入 <code>COPY_DST</code> 才允许这条写入路径。绘制前设置对应 Bind Group，随后提交新的 Command Buffer。</p>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="wgsl-interstage"><ArrowLeft aria-hidden="true" /> Inter-stage 变量</LessonLink>
        <div><h2>接下来</h2><p>把相同的数据布局切换到 Storage Buffer，并用运行时数组批量保存实例数据。</p></div>
        <LessonLink lessonId="storage-buffers">存储缓冲区 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
