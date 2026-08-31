import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Database,
  Link2,
  MonitorUp,
} from 'lucide-react';
import type { ReactNode } from 'react';

import uniformCoreSource from '../../core/uniforms.ts?raw';
import playgroundSource from './UniformPlayground.tsx?raw';
import webgpuHelpersSource from '../../core/webgpu.ts?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { UniformPlayground } from './UniformPlayground';

const packValuesCode = `const values = new Float32Array([
  red, green, blue, alpha, // color: 4 × f32
  offsetX, offsetY,        // offset: 2 × f32
  scaleX, scaleY,          // scale: 2 × f32
]);

device.queue.writeBuffer(uniformBuffer, 0, values);`;

const bindGroupCode = `const uniformBuffer = device.createBuffer({
  label: 'triangle color, offset and scale',
  size: 32,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  label: 'triangle uniform bind group',
  layout: pipeline.getBindGroupLayout(0),
  entries: [{
    binding: 0,
    resource: { buffer: uniformBuffer },
  }],
});`;

const drawWithUniformCode = `device.queue.writeBuffer(uniformBuffer, 0, packedValues);

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass(renderPassDescriptor);
pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.draw(3);
pass.end();

device.queue.submit([encoder.finish()]);`;

const sourceFiles = [
  { id: 'core', label: 'core/uniforms.ts', code: uniformCoreSource },
  { id: 'playground', label: 'UniformPlayground.tsx', code: playgroundSource },
  { id: 'helpers', label: 'core/webgpu.ts', code: webgpuHelpersSource },
] as const;

export function UniformsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>Uniforms</h1>
        <p className="lesson-lead">把 JavaScript 中的颜色、偏移与缩放打包进 32 字节 GPUBuffer，通过 Bind Group 交给 Vertex 与 Fragment Shader 共享读取。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Uniform Buffer</li><li>Bind Group</li><li>约 32 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="uniform-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Boxes /></div>
        <div><h2 id="uniform-learn-heading">本章只增加一条数据入口</h2><ul><li>输入来自 React 控件产生的颜色、offset 与 scale</li><li><code>Float32Array</code> 按 WGSL 对齐规则形成 32 字节 CPU 副本</li><li><code>UNIFORM | COPY_DST</code> 允许 Shader 读取与 Queue 写入</li><li>同一 Bind Group 在绘制之间复用，Buffer 内容可以继续更新</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>先看清输入如何抵达最终像素</h2>
        <ol className="pipeline" aria-label="Uniform 数据路径">
          <li><span><Boxes aria-hidden="true" /></span><strong>React controls</strong><small>产生 color、offset、scale 数值</small></li>
          <li><span><Database aria-hidden="true" /></span><strong>32B Uniform Buffer</strong><small>queue.writeBuffer 复制 Float32Array</small></li>
          <li><span><Link2 aria-hidden="true" /></span><strong>Bind Group 0</strong><small>binding 0 对接 WGSL var&lt;uniform&gt;</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Vertex 改变位置，Fragment 输出颜色</small></li>
        </ol>
        <p>Uniform 值在一次 Draw Call 的大量 Shader 调用之间共享。Vertex Shader 读取 offset 和 scale，Fragment Shader 从同一块 Buffer 读取 color。</p>
      </section>

      <section id="binding-model" className="lesson-section">
        <h2>Shader 声明插槽，Bind Group 提供资源</h2>
        <div className="binding-grid">
          <article><Database aria-hidden="true" /><h3>GPUBuffer</h3><code>UNIFORM | COPY_DST</code><p>分配 32 字节，保存颜色、偏移和缩放。</p></article>
          <article><Link2 aria-hidden="true" /><h3>Bind Group</h3><code>group 0 · binding 0</code><p>依据 Pipeline 的布局，把具体 Buffer 放入资源插槽。</p></article>
          <article><Boxes aria-hidden="true" /><h3>WGSL variable</h3><code>var&lt;uniform&gt;</code><p>Vertex 与 Fragment 入口函数都可以只读访问。</p></article>
        </div>
        <CodeBlock label="创建 Uniform Buffer 与 Bind Group">{bindGroupCode}</CodeBlock>
        <p><code>pipeline.getBindGroupLayout(0)</code> 取出 group 0 的布局。Render Pass 中的 <code>setBindGroup(0, bindGroup)</code> 再把这一组资源绑定到当前 Pipeline。</p>
      </section>

      <section id="memory-layout" className="lesson-section">
        <h2>WGSL 对齐规则决定每个字段的字节位置</h2>
        <p><code>vec4f</code> 的大小与对齐均为 16 字节，color 放在 0–15。两个 <code>vec2f</code> 各占 8 字节，offset 位于 16–23，scale 位于 24–31。JavaScript 使用八个连续 f32 创建完全一致的内存图。</p>
        <div className="uniform-byte-map" role="img" aria-label="32 字节 Uniform Buffer 的字段布局"><span data-field="color">color · 0–15</span><span data-field="offset">offset · 16–23</span><span data-field="scale">scale · 24–31</span></div>
        <CodeBlock label="打包并上传 32 字节">{packValuesCode}</CodeBlock>
      </section>

      <section id="uniform-lab" className="lesson-section lesson-section--wide">
        <h2>用一份 Buffer 驱动两个 Shader 阶段</h2>
        <p>拖动 offset 与 scale 会改变 Vertex Shader 的位置计算，颜色输入由 Fragment Shader 读取。状态区会显示当前 32 字节值；每次交互只更新 Buffer 内容并记录一组新绘制命令。</p>
        <UniformPlayground />
      </section>

      <section id="update-path" className="lesson-section">
        <h2>更新数据与提交绘制有清楚的先后关系</h2>
        <p><code>queue.writeBuffer()</code> 把当前 TypedArray 安排到 Buffer。随后 Render Pass 设置 Pipeline 与 Bind Group，记录 <code>draw(3)</code>；<code>finish()</code> 结束编码，<code>queue.submit()</code> 提交本帧 Command Buffer。</p>
        <CodeBlock label="先更新 Uniform，再提交绘制">{drawWithUniformCode}</CodeBlock>
        <p>Pipeline、Bind Group 和 GPUBuffer 都在初始化时创建并复用。控件变化时更新 32 字节数据即可；Canvas 尺寸变化只触发重新绘制。</p>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现保留了初始化与清理</h2>
        <p>核心文件包含 WGSL、数据打包、Adapter 与 Device 检查、资源创建、更新、绘制和销毁。React 文件管理交互状态、异步取消、ResizeObserver 与设备丢失信息；共享 helper 负责 Canvas 配置和编译诊断。</p>
        <LessonSourcePanel title="Uniforms 完整项目源码" description="GPU 核心、React 实验与共享 WebGPU helper" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>限制、错误与资源释放都可追踪</h2>
        <p>创建 Shader Module 后读取完整 compilation info，Pipeline 使用异步创建接口，初始化期间随时检查 AbortSignal。实际项目还应从 <code>device.limits.maxUniformBufferBindingSize</code> 判断目标数据是否适合放入单个 Uniform binding。</p>
        <p>实验结束时销毁 Uniform Buffer，解除 Canvas 配置并销毁 Device。<code>device.lost</code> 会把运行期设备失效原因写入状态区，避免 Canvas 静默停止。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>来源</strong>能够从控件值追踪到 Float32Array。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>布局</strong>能够写出 color、offset、scale 的字节范围。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>绑定</strong>能够解释 group 0、binding 0 和 setBindGroup(0) 的对应关系。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>提交</strong>能够说明 writeBuffer、draw、finish 与 submit 的时机。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="wgsl-interstage"><ArrowLeft aria-hidden="true" /> Inter-stage 变量</LessonLink>
        <div><h2>接下来</h2><p>Uniform 适合小块共享参数。下一章把 32 字节记录扩展成运行时数组，用 Storage Buffer 在一次 Draw Call 中保存多个实例。</p></div>
        <LessonLink lessonId="storage-buffers">存储缓冲区 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
