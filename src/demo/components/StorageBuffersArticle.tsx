import { ArrowLeft, ArrowRight, Boxes, Database, Layers3 } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { StorageBufferPlayground } from './StorageBufferPlayground';

const uniformToStorageCode = `// JavaScript：更换 Buffer 的用途
const buffer = device.createBuffer({
  size: bufferSize,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

// WGSL：声明只读 Storage 地址空间
@group(0) @binding(0)
var<storage, read> instances: array<InstanceData>;`;

const instancedDrawCode = `pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);

// 顶点着色器运行 3 × instanceCount 次。
// 每个实例收到不同的 @builtin(instance_index)。
pass.draw(3, instanceCount);`;

const vertexPullingCode = `@group(0) @binding(2)
var<storage, read> positions: array<vec2f>;

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> @builtin(position) vec4f {
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}`;

export function StorageBuffersArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>存储缓冲区</h1>
        <p className="lesson-lead">沿用 Uniform 课程的数据布局，把资源切换到 Storage Buffer，再使用运行时数组与 instance_index 在一次 draw call 中绘制多个实例。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Storage Buffer</li><li>Instancing</li><li>约 26 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="storage-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Database /></div>
        <div><h2 id="storage-learn-heading">你将理解</h2><ul><li>Uniform Buffer 与 Storage Buffer 的用途差异</li><li><code>var&lt;storage, read&gt;</code> 如何访问运行时数组</li><li><code>instance_index</code> 如何选择每个实例的数据</li><li>顶点数据为什么也可以通过 Storage Buffer 拉取</li></ul></div>
      </section>

      <section id="uniform-to-storage" className="lesson-section">
        <h2>从 Uniform 改为 Storage</h2>
        <p>当前教程把 Storage Buffer 作为 Uniforms 的直接后续。最小迁移只涉及两处：JavaScript 将 usage 换成 <code>STORAGE</code>，WGSL 将地址空间换成 <code>var&lt;storage, read&gt;</code>。Bind Group 的连接方式保持一致。</p>
        <CodeBlock label="只读 Storage Buffer">{uniformToStorageCode}</CodeBlock>
      </section>

      <section id="buffer-differences" className="lesson-section">
        <h2>Uniform 与 Storage 的三项差异</h2>
        <div className="resource-role-grid">
          <article><Boxes aria-hidden="true" /><h3>典型访问成本</h3><p>Uniform 针对频繁读取的小块共享参数优化，常见绘制参数优先考虑它。</p></article>
          <article><Database aria-hidden="true" /><h3>容量</h3><p>规范保证 Uniform 上限至少 64 KiB，Storage 上限至少 128 MiB；实际值从 Device Limits 查询。</p></article>
          <article><Layers3 aria-hidden="true" /><h3>访问模式</h3><p>Uniform 只读；Storage 可以声明为只读，也可以供 Compute Shader 读写。</p></article>
        </div>
      </section>

      <section id="instanced-drawing" className="lesson-section">
        <h2>运行时数组配合 instance_index</h2>
        <p>把每个对象的颜色、偏移和缩放放进 <code>array&lt;InstanceData&gt;</code>。调用 <code>draw(3, instanceCount)</code> 后，Vertex Shader 会为每个实例收到不同的 <code>@builtin(instance_index)</code>，再从数组中选择对应记录。</p>
        <CodeBlock label="一次命令绘制多个实例">{instancedDrawCode}</CodeBlock>
      </section>

      <section id="storage-lab" className="lesson-section lesson-section--wide">
        <h2>一次 draw call 绘制多个三角形</h2>
        <p>拖动实例数量。JavaScript 会批量写入一块 Storage Buffer，Bind Group 保持复用，Render Pass 只记录一次 <code>draw(3, count)</code>。</p>
        <StorageBufferPlayground />
      </section>

      <section id="vertex-pulling" className="lesson-section">
        <h2>Storage Buffer 也能保存顶点数据</h2>
        <p>Vertex Shader 可以使用 <code>vertex_index</code> 主动索引 Storage Buffer，这种方式通常称为 vertex pulling。它允许更自由的数据访问；下一课介绍专门的 Vertex Buffer 布局和顺序读取路径。</p>
        <CodeBlock language="wgsl" label="通过 vertex_index 拉取位置">{vertexPullingCode}</CodeBlock>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="uniforms"><ArrowLeft aria-hidden="true" /> Uniforms</LessonLink>
        <div><h2>接下来</h2><p>使用 Vertex Buffer 的 arrayStride、offset 和 format 描述逐顶点输入。</p></div>
        <LessonLink lessonId="vertex-buffers">顶点缓冲区 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
