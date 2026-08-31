import { ArrowLeft, ArrowRight, Braces, GitBranch, ScanLine } from 'lucide-react';
import type { ReactNode } from 'react';

import { INTERSTAGE_TRIANGLE_WGSL } from '../../core/webgpu';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { WebgpuTrianglePlayground } from './WebgpuTrianglePlayground';

const interfaceCode = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex fn vertexMain(...) -> VertexOutput { ... }

@fragment fn fragmentMain(
  input: VertexOutput,
) -> @location(0) vec4f {
  return input.color;
}`;

export function WgslInterstageArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>基础概念</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>Inter-stage 变量</h1>
        <p className="lesson-lead">用结构体连接 Vertex Shader 与 Fragment Shader，再让光栅化器为三种顶点颜色生成连续过渡。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WGSL</li><li>Inter-stage</li><li>约 20 分钟</li></ul>
      </header>

      {toc}

      <section className="learning-note" aria-labelledby="wgsl-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Braces /></div>
        <div><h2 id="wgsl-learn-heading">你将理解</h2><ul><li><code>@vertex</code> 与 <code>@fragment</code> 如何声明入口函数</li><li><code>@builtin(position)</code> 与 <code>@location(n)</code> 的接口职责</li><li>两个阶段如何通过相同 location 对接数据</li><li>光栅化器为什么会在三角形内部插值颜色</li></ul></div>
      </section>

      <section id="entry-points" className="lesson-section">
        <h2>属性把普通函数接入 GPU 阶段</h2>
        <p>WGSL 是强类型着色语言。<code>@vertex</code>、<code>@fragment</code> 与 <code>@compute</code> 会把函数声明为对应阶段的入口。Pipeline 通过 <code>entryPoint</code> 选择需要运行的函数。</p>
        <div className="shader-stage-grid">
          <article><span><GitBranch aria-hidden="true" /></span><div><h3>@vertex</h3><p>每个顶点调用一次，必须提供裁剪空间位置。</p><code>@builtin(position)</code></div></article>
          <article><span><ScanLine aria-hidden="true" /></span><div><h3>@fragment</h3><p>对覆盖到的片段调用，输出到指定颜色附件。</p><code>@location(0)</code></div></article>
        </div>
      </section>

      <section id="stage-interface" className="lesson-section">
        <h2>相同 location 构成阶段接口</h2>
        <p>Vertex Shader 输出结构体中的 <code>@location(0) color</code>，Fragment Shader 用同样的 location 和兼容类型接收。Vertex 阶段输出的 <code>@builtin(position)</code> 交给光栅化器；Fragment 阶段也可以单独接收同名 builtin 来读取帧缓冲区位置，它无需通过 <code>@location</code> 与顶点输出配对。</p>
        <CodeBlock language="wgsl" label="WGSL 阶段接口">{interfaceCode}</CodeBlock>
      </section>

      <section id="interpolation-lab" className="lesson-section lesson-section--wide">
        <h2>运行三色插值实验</h2>
        <p>三个顶点各自返回一种颜色。GPU 在光栅化时根据片段位于三角形中的位置计算权重，再把三个颜色按权重混合。修改 <code>colors</code> 数组并重新运行，可以直接验证这个过程。</p>
        <WebgpuTrianglePlayground
          title="阶段传值颜色三角形"
          initialSource={INTERSTAGE_TRIANGLE_WGSL}
          canvasLabel="通过 Inter-stage 颜色插值绘制的三色 WebGPU 三角形"
        />
      </section>

      <section id="wgsl-diagnostics" className="lesson-section">
        <h2>编译信息要回到编辑器</h2>
        <p><code>GPUShaderModule.getCompilationInfo()</code> 会返回消息类型、行号、列号和文本。实验把所有 error 消息原样呈现在底部，因此类型不匹配、入口缺失或语法错误都能定位到 WGSL 源码。</p>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="fundamentals"><ArrowLeft aria-hidden="true" /> 基础知识</LessonLink>
        <div><h2>接下来</h2><p>使用 Uniform Buffer 把颜色、偏移和缩放从 JavaScript 同时送入两个着色器阶段。</p></div>
        <LessonLink lessonId="uniforms">Uniforms <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
