import { Box, Braces, Cpu, Database, Image as ImageIcon, Layers3, ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';

const shaderAnalogyCode = `const shader = (value: number) => value * 2;
const input = [1, 2, 3, 4];
const output = input.map(shader); // [2, 4, 6, 8]

// Vertex Shader 也由系统反复调用。
// draw(count) 决定调用次数，vertex_index 提供当前索引。`;

const vertexProcessingCode = `function draw(count, vertexShader) {
  const internalPositions = [];
  for (let vertexIndex = 0; vertexIndex < count; vertexIndex += 1) {
    internalPositions.push(vertexShader(vertexIndex));
  }
  return internalPositions;
}`;

const dataSourceCode = `@group(0) @binding(0) var<uniform> globals: Globals;
@group(0) @binding(1) var<storage, read> objects: array<Object>;
@group(0) @binding(2) var colorTexture: texture_2d<f32>;

@vertex fn vertexMain(
  @location(0) position: vec3f,
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  // Uniform、Attribute、Raw Buffer、Texture、Constant
  // 都可以参与生成 Inter-stage 输出。
}`;

export function HowWebgpuWorksArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>基础概念</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>WebGPU 工作原理</h1>
        <p className="lesson-lead">按照当前教程，用 Array.map 类比理解 Shader 调用，再把六类数据来源、顶点处理、光栅化和片段输出连接成完整心智模型。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Shader 调用模型</li><li>六类数据来源</li><li>约 24 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="how-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Cpu /></div>
        <div><h2 id="how-learn-heading">你将理解</h2><ul><li>GPU 为什么根据 draw count 反复调用 Vertex Shader</li><li>Uniform、Attribute、Raw Buffer、Texture、Inter-stage 与 Constant 的职责</li><li>顶点位置如何进入图元组装和光栅化</li><li>Fragment Shader 如何把结果写进 Render Target</li></ul></div>
      </section>

      <section id="shader-call-model" className="lesson-section">
        <h2>Shader 是由 GPU 调用的函数</h2>
        <p>当前教程先用 <code>Array.map</code> 建立类比：开发者提供函数和输入规模，系统负责重复调用。Vertex Shader 的输入规模来自 <code>draw()</code>，每次调用通过 <code>vertex_index</code> 获得索引。</p>
        <CodeBlock label="从 Array.map 理解 Shader">{shaderAnalogyCode}</CodeBlock>
      </section>

      <section id="shader-data-sources" className="lesson-section lesson-section--wide">
        <h2>Vertex 与 Fragment Shader 的六类数据来源</h2>
        <div className="shader-source-grid">
          <article><Box aria-hidden="true" /><h3>Uniforms</h3><p>一次 draw 中保持一致的小块只读参数。</p></article>
          <article><Layers3 aria-hidden="true" /><h3>Attributes</h3><p>由 Vertex Buffer Layout 按顶点顺序提取的数据。</p></article>
          <article><Database aria-hidden="true" /><h3>Raw Buffers</h3><p>通过 Bind Group 访问并自行计算索引的 Buffer。</p></article>
          <article><ImageIcon aria-hidden="true" /><h3>Textures</h3><p>支持多维寻址、采样和过滤的数据资源。</p></article>
          <article><ScanLine aria-hidden="true" /><h3>Inter-stage</h3><p>Vertex Shader 输出，经插值后进入 Fragment Shader。</p></article>
          <article><Braces aria-hidden="true" /><h3>Constants</h3><p>写在 WGSL 中或通过 Pipeline 提供的固定值。</p></article>
        </div>
        <CodeBlock language="wgsl" label="多种数据入口示意">{dataSourceCode}</CodeBlock>
      </section>

      <section id="vertex-processing" className="lesson-section">
        <h2>顶点阶段生成内部位置序列</h2>
        <p>GPU 会调用 Vertex Shader 指定次数，把每次返回的 <code>@builtin(position)</code> 保存到内部位置序列。位置可以来自硬编码数组、Vertex Buffer、Storage Buffer、Uniform 计算或 Texture 查询。</p>
        <CodeBlock label="顶点调用的 JavaScript 类比">{vertexProcessingCode}</CodeBlock>
      </section>

      <section id="rasterization" className="lesson-section">
        <h2>图元组装、光栅化与 Inter-stage 插值</h2>
        <p>Primitive topology 决定如何把位置解释为点、线或三角形。光栅化器找出图元覆盖的像素中心，并在这些位置上插值 Vertex Shader 输出的 Inter-stage 数据。</p>
        <ol className="pipeline" aria-label="WebGPU 从顶点调用到片段输出的阶段">
          <li><span><Cpu aria-hidden="true" /></span><strong>draw count</strong><small>确定顶点调用次数</small></li>
          <li><span><Braces aria-hidden="true" /></span><strong>Vertex Shader</strong><small>生成 position 与阶段输出</small></li>
          <li><span><Layers3 aria-hidden="true" /></span><strong>Primitive Assembly</strong><small>组成点、线或三角形</small></li>
          <li><span><ScanLine aria-hidden="true" /></span><strong>Rasterizer</strong><small>覆盖测试与插值</small></li>
          <li><span><Braces aria-hidden="true" /></span><strong>Fragment Shader</strong><small>为每个片段生成值</small></li>
          <li><span><ImageIcon aria-hidden="true" /></span><strong>Render Target</strong><small>写入 Texture Attachment</small></li>
        </ol>
      </section>

      <section id="fragment-processing" className="lesson-section">
        <h2>Fragment Shader 写入纹理</h2>
        <p>Fragment Shader 的 <code>@location(0)</code> 输出连接到 Render Pass 的第一个颜色附件。输出常用于颜色，也可以保存法线、材质参数或后处理需要的数据。深度测试、混合等固定功能阶段会进一步决定最终写入结果。</p>
      </section>

      <section id="course-position" className="next-steps">
        <div><h2>这篇课在当前目录中的位置</h2><p>参考教程把“工作原理”放在 WGSL 之后、兼容性模式之前。前面的数据传递课程提供具体 API，这一篇负责把它们合并成统一的执行模型。</p></div>
      </section>
    </article>
  );
}
