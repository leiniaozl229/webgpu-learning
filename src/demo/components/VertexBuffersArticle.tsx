import { ArrowLeft, Database, Rows3 } from 'lucide-react';
import type { ReactNode } from 'react';

import { VERTEX_BUFFER_SETUP_SOURCE, VERTEX_BUFFER_WGSL } from '../../core/vertexBuffers';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { VertexBufferPlayground } from './VertexBufferPlayground';

export function VertexBuffersArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>顶点缓冲区</h1>
        <p className="lesson-lead">把位置和颜色交错存进 Float32Array，再用字节级布局告诉 Pipeline 如何为每次顶点调用取出一条记录。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>GPUBuffer</li><li>Vertex Layout</li><li>约 26 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="vertex-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Rows3 /></div>
        <div><h2 id="vertex-learn-heading">你将理解</h2><ul><li>TypedArray 如何复制到 VERTEX Buffer</li><li><code>arrayStride</code> 如何定位下一条顶点记录</li><li>attribute offset 与 format 如何切出字段</li><li><code>setVertexBuffer(0, buffer)</code> 如何连接 Pipeline slot</li></ul></div>
      </section>

      <section id="interleaved-data" className="lesson-section">
        <h2>每个顶点是一条 20 字节记录</h2>
        <p>一条记录包含两个位置分量和三个颜色分量，共五个 <code>f32</code>。每个 f32 占 4 字节，因此下一条记录从当前地址加 20 字节开始。</p>
        <div className="vertex-record-summary"><span><Database aria-hidden="true" /><strong>Float32Array</strong><small>3 × 5 个值 = 60 字节</small></span><span><Rows3 aria-hidden="true" /><strong>arrayStride</strong><small>5 × 4 = 20 字节</small></span></div>
      </section>

      <section id="vertex-layout" className="lesson-section">
        <h2>offset 与 format 按字节切分字段</h2>
        <p>position 从记录开头读取 <code>float32x2</code>，占 8 字节。color 跳过位置字段，从 offset 8 开始读取 <code>float32x3</code>，占剩余 12 字节。shaderLocation 与 WGSL 的 <code>@location</code> 一一对应。</p>
        <CodeBlock label="上传数据并描述 Vertex Layout">{VERTEX_BUFFER_SETUP_SOURCE}</CodeBlock>
      </section>

      <section id="vertex-buffer-lab" className="lesson-section lesson-section--wide">
        <h2>逐条检查 GPU 拉取的数据</h2>
        <p>选择三个顶点，观察它们在 Buffer 中的字节范围、position 字段与 color 字段。右侧 Canvas 使用完全相同的 60 字节进行真实 WebGPU 绘制。</p>
        <VertexBufferPlayground />
      </section>

      <section id="shader-inputs" className="lesson-section">
        <h2>Pipeline 布局把字段送进 WGSL</h2>
        <p>Vertex Shader 接收结构体后无需知道 Buffer 的总大小和 TypedArray 来源。它只看到 location 0 的 <code>vec2f</code> 与 location 1 的 <code>vec3f</code>。字段解析工作由 Pipeline 的 vertex buffer layout 完成。</p>
        <CodeBlock language="wgsl" label="Vertex Buffer 对应的 WGSL 输入">{VERTEX_BUFFER_WGSL}</CodeBlock>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="storage-buffers"><ArrowLeft aria-hidden="true" /> 存储缓冲区</LessonLink>
        <div><h2>接下来</h2><p>按照当前教程目录，下一组课程进入纹理、图像、视频、立方体贴图、存储纹理与 MSAA。</p></div>
      </section>
    </article>
  );
}
