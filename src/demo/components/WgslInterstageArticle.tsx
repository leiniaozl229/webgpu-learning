import {
  ArrowLeft,
  ArrowRight,
  Braces,
  CheckCircle2,
  GitBranch,
  MonitorUp,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';

import webgpuCoreSource from '../../core/webgpu.ts?raw';
import { INTERSTAGE_TRIANGLE_WGSL } from '../../core/webgpu';
import playgroundSource from './WebgpuTrianglePlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { WebgpuTrianglePlayground } from './WebgpuTrianglePlayground';

const locationPairCode = `struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  output.color = colors[vertexIndex];
  return output;
}

@fragment fn fragmentMain(
  @location(0) color: vec4f,
) -> @location(0) vec4f {
  return color;
}`;

const interpolationCode = `// 浮点数据默认使用 perspective + center。
@location(0) @interpolate(perspective, center) color: vec4f,

// 整数数据必须使用 flat，整个图元读取同一个顶点的值。
@location(1) @interpolate(flat) materialId: u32,`;

const frameCode = `const encoder = device.createCommandEncoder({
  label: 'Inter-stage triangle encoder',
});
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    clearValue: { r: 0.055, g: 0.075, b: 0.12, a: 1 },
    loadOp: 'clear',
    storeOp: 'store',
  }],
});

pass.setPipeline(pipeline);
pass.draw(3);
pass.end();

const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);`;

const sourceFiles = [
  { id: 'core', label: 'core/webgpu.ts', code: webgpuCoreSource },
  { id: 'playground', label: 'WebgpuTrianglePlayground.tsx', code: playgroundSource },
] as const;

export function WgslInterstageArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>Inter-stage 变量</h1>
        <p className="lesson-lead">从三个顶点颜色出发，沿着 Vertex Shader、光栅化器和 Fragment Shader 追踪数据，最终在 Canvas 中看到连续的颜色插值。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WGSL</li><li>Inter-stage</li><li>约 28 分钟</li></ul>
      </header>

      {toc}

      <section id="lesson-path" className="learning-note" aria-labelledby="wgsl-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Braces /></div>
        <div><h2 id="wgsl-learn-heading">完成本章后，你能够</h2><ul><li>说明三个顶点颜色从 WGSL 数组到 Canvas 像素的去向</li><li>区分 Vertex 与 Fragment 阶段中 <code>@builtin(position)</code> 的职责</li><li>用相同的 <code>@location(n)</code> 连接两个阶段</li><li>选择默认插值或 <code>flat</code> 插值，并读懂完整编译错误</li></ul></div>
      </section>

      <section id="entry-points" className="lesson-section">
        <h2>入口函数决定代码运行在哪个阶段</h2>
        <p>WGSL 是强类型着色语言。<code>@vertex</code>、<code>@fragment</code> 与 <code>@compute</code> 把普通函数注册为 GPU 入口；Render Pipeline 的 <code>vertex.entryPoint</code> 和 <code>fragment.entryPoint</code> 再选择本次绘制使用的函数。</p>
        <div className="shader-stage-grid">
          <article><span><GitBranch aria-hidden="true" /></span><div><h3>@vertex</h3><p><code>draw(3)</code> 产生三次顶点调用，每次必须输出裁剪空间位置。</p><code>@builtin(position)</code></div></article>
          <article><span><ScanLine aria-hidden="true" /></span><div><h3>@fragment</h3><p>光栅化覆盖到片段后调用，返回值写入 Render Pass 的颜色附件 0。</p><code>@location(0)</code></div></article>
        </div>
      </section>

      <section id="stage-interface" className="lesson-section">
        <h2>location 是跨阶段的数据接口</h2>
        <p>Vertex Shader 把每个顶点的 <code>color</code> 写到 location 0，Fragment Shader 用同一 location 和兼容类型接收。字段名与结构体名可以不同，连接依据始终是数字 location、数据类型和插值规则。</p>
        <p>Vertex 阶段输出的 <code>@builtin(position)</code> 为光栅化器提供裁剪空间坐标。Fragment 阶段读取同名 builtin 时得到当前片段的帧缓冲区坐标，两者由 GPU 固定功能处理。</p>
        <CodeBlock language="wgsl" label="用 location 0 配对颜色">{locationPairCode}</CodeBlock>
      </section>

      <section id="interpolation" className="lesson-section">
        <h2>光栅化器为每个片段计算插值值</h2>
        <p>三角形内部的每个片段都对应三个重心权重。GPU 用这些权重混合三个顶点的颜色；默认的 <code>perspective</code> 会执行透视校正，采样位置默认为像素中心。整数类型无法连续混合，必须声明 <code>@interpolate(flat)</code>。</p>
        <CodeBlock language="wgsl" label="显式声明插值模式">{interpolationCode}</CodeBlock>
      </section>

      <section id="interpolation-lab" className="lesson-section lesson-section--wide">
        <h2>运行三色插值实验</h2>
        <p>输入数据来自 Vertex Shader 中的 <code>positions</code> 与 <code>colors</code> 数组。修改颜色后点击“运行”，页面会重新创建 Shader Module 与 Pipeline，提交 <code>draw(3)</code>，并把当前 Canvas Texture 作为最终输出。</p>
        <WebgpuTrianglePlayground title="阶段传值颜色三角形" initialSource={INTERSTAGE_TRIANGLE_WGSL} canvasLabel="通过 Inter-stage 颜色插值绘制的三色 WebGPU 三角形" />
      </section>

      <section id="frame-flow" className="lesson-section">
        <h2>每次绘制都重新获取当前纹理并提交命令</h2>
        <ol className="pipeline" aria-label="Inter-stage 数据与命令路径">
          <li><span><Braces aria-hidden="true" /></span><strong>WGSL 数组</strong><small>为 3 次 Vertex 调用提供位置和颜色</small></li>
          <li><span><GitBranch aria-hidden="true" /></span><strong>VertexOutput</strong><small>position 进入光栅化器，color 进入 location 0</small></li>
          <li><span><Sparkles aria-hidden="true" /></span><strong>Rasterizer</strong><small>生成片段并计算颜色插值</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Fragment 输出写入颜色附件 0</small></li>
        </ol>
        <p><code>getCurrentTexture()</code> 只服务当前帧。<code>finish()</code> 结束命令记录并生成不可修改的 Command Buffer，<code>queue.submit()</code> 随后把命令交给 GPU。</p>
        <CodeBlock label="记录并提交本帧命令">{frameCode}</CodeBlock>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>阅读正在运行的完整实现</h2>
        <p><code>core/webgpu.ts</code> 包含能力检查、WGSL 编译、异步 Pipeline、Canvas 尺寸同步、命令提交和清理；React 文件负责编辑器状态、重试、设备丢失提示与组件卸载。两个文件共同组成页面上正在运行的实验。</p>
        <LessonSourcePanel title="Inter-stage 完整项目源码" description="渲染核心与 React 实验组件" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>失败路径也要完成收尾</h2>
        <p>Shader Module 创建后立即调用 <code>getCompilationInfo()</code>，把全部 error 的行号、列号和消息显示在实验底部。重新运行会先中止旧初始化并释放旧 Session；组件卸载时断开 ResizeObserver、调用 <code>context.unconfigure()</code>，最后销毁 Device。</p>
        <p>Canvas 尺寸按照容器与设备像素比计算，并受 <code>device.limits.maxTextureDimension2D</code> 限制。调整窗口后重新绘制时，仍然使用当前帧的新 Texture。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>输入</strong>能够指出 positions、colors 与 vertex_index 的来源。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>接口</strong>能够解释 location 0 如何连接两个阶段。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>执行</strong>能够复述 draw、光栅化、Fragment 与颜色附件的顺序。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>生命周期</strong>能够定位编译信息、Canvas resize 与资源清理代码。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="fundamentals"><ArrowLeft aria-hidden="true" /> 基础知识</LessonLink>
        <div><h2>接下来</h2><p>Inter-stage 数据由 Vertex Shader 产生。下一章加入 Uniform Buffer，让 JavaScript 为两个着色器阶段提供一份共享参数。</p></div>
        <LessonLink lessonId="uniforms">Uniforms <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
