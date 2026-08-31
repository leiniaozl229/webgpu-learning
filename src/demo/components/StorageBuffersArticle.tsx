import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Database,
  Layers3,
  MonitorUp,
} from 'lucide-react';
import type { ReactNode } from 'react';

import storageCoreSource from '../../core/storageBuffers.ts?raw';
import webgpuHelpersSource from '../../core/webgpu.ts?raw';
import playgroundSource from './StorageBufferPlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { StorageBufferPlayground } from './StorageBufferPlayground';

const uniformToStorageCode = `// JavaScript：分配 64 条、每条 32 字节的实例记录。
const storageBuffer = device.createBuffer({
  label: 'instance color, offset and scale',
  size: 64 * 32,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

// WGSL：运行时数组占据 group 0 / binding 0。
@group(0) @binding(0)
var<storage, read> instances: array<InstanceData>;`;

const uploadInstancesCode = `const values = new Float32Array(instanceCount * 8);

for (let index = 0; index < instanceCount; index += 1) {
  const base = index * 8;
  values.set([
    red, green, blue, 1, // color: 16B
    offsetX, offsetY,    // offset: 8B
    scaleX, scaleY,      // scale: 8B
  ], base);
}

device.queue.writeBuffer(storageBuffer, 0, values);`;

const instancedDrawCode = `pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);

// 共运行 3 × instanceCount 次 Vertex Shader。
// 每个实例收到自己的 @builtin(instance_index)。
pass.draw(3, instanceCount);
pass.end();

device.queue.submit([encoder.finish()]);`;

const vertexPullingCode = `@group(0) @binding(2)
var<storage, read> positions: array<vec2f>;

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
) -> @builtin(position) vec4f {
  return vec4f(positions[vertexIndex], 0.0, 1.0);
}`;

const sourceFiles = [
  { id: 'core', label: 'core/storageBuffers.ts', code: storageCoreSource },
  { id: 'playground', label: 'StorageBufferPlayground.tsx', code: playgroundSource },
  { id: 'helpers', label: 'core/webgpu.ts', code: webgpuHelpersSource },
] as const;

export function StorageBuffersArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>存储缓冲区</h1>
        <p className="lesson-lead">把颜色、偏移和缩放扩展成 32 字节记录数组，通过只读 Storage Buffer 与 instance_index 在一次 Draw Call 中绘制多个实例。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Storage Buffer</li><li>Instancing</li><li>约 34 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="storage-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Database /></div>
        <div><h2 id="storage-learn-heading">沿用上一章的记录布局</h2><ul><li>每个实例仍然使用 color、offset 与 scale，共 32 字节</li><li>输入来自 JavaScript 生成的 <code>Float32Array</code></li><li>运行时数组允许 Shader 按 instance_index 读取记录</li><li>本章使用只读 Storage，Compute 课程再介绍读写用途</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>实例数量决定上传范围与 Shader 调用次数</h2>
        <ol className="pipeline" aria-label="Storage Buffer 数据路径">
          <li><span><Boxes aria-hidden="true" /></span><strong>Instance controls</strong><small>选择 1–64 条实例记录</small></li>
          <li><span><Database aria-hidden="true" /></span><strong>Storage Buffer</strong><small>queue.writeBuffer 上传 count × 32B</small></li>
          <li><span><Layers3 aria-hidden="true" /></span><strong>instance_index</strong><small>每个实例索引自己的 InstanceData</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>一次 Render Pass 输出全部三角形</small></li>
        </ol>
      </section>

      <section id="uniform-to-storage" className="lesson-section">
        <h2>Buffer usage 与 WGSL 地址空间一起切换</h2>
        <p>JavaScript 把 usage 改成 <code>STORAGE | COPY_DST</code>，WGSL 把变量声明为 <code>var&lt;storage, read&gt;</code>。Bind Group 仍然把具体 Buffer 接到 group 0、binding 0；Pipeline 会根据 Shader 声明推导布局。</p>
        <CodeBlock label="创建只读 Storage Buffer">{uniformToStorageCode}</CodeBlock>
        <p>Buffer 按最多 64 条记录一次分配，交互时只更新当前 count 对应的前缀。实际项目应先读取 <code>device.limits.maxStorageBufferBindingSize</code>，再决定最大记录数量。</p>
      </section>

      <section id="buffer-differences" className="lesson-section">
        <h2>Uniform 与 Storage 解决不同的数据规模</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th scope="col">维度</th><th scope="col">Uniform Buffer</th><th scope="col">Storage Buffer</th></tr></thead>
            <tbody>
              <tr><th scope="row">典型内容</th><td>一帧或一次绘制共享的小块参数</td><td>对象数组、运行时数组与计算数据</td></tr>
              <tr><th scope="row">WGSL</th><td><code>var&lt;uniform&gt;</code></td><td><code>var&lt;storage, read&gt;</code> 或 <code>read_write</code></td></tr>
              <tr><th scope="row">本章访问</th><td>所有调用读取同一条记录</td><td>instance_index 选择不同记录</td></tr>
              <tr><th scope="row">设备限制</th><td><code>maxUniformBufferBindingSize</code></td><td><code>maxStorageBufferBindingSize</code></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="instanced-drawing" className="lesson-section">
        <h2>运行时数组配合 instance_index</h2>
        <p>CPU 端按每条八个 f32 写入颜色、偏移与缩放。Vertex Shader 每次运行都用 <code>instances[instanceIndex]</code> 读取当前记录，Fragment Shader 通过 Inter-stage color 得到该实例的颜色。</p>
        <CodeBlock label="批量打包实例记录">{uploadInstancesCode}</CodeBlock>
        <p><code>draw(3, instanceCount)</code> 让三角形的三个顶点对每个实例各运行一次，因此 Vertex Shader 调用总数是 <code>3 × instanceCount</code>。</p>
        <CodeBlock label="一次命令绘制多个实例">{instancedDrawCode}</CodeBlock>
      </section>

      <section id="storage-lab" className="lesson-section lesson-section--wide">
        <h2>一次 Draw Call 绘制多个三角形</h2>
        <p>拖动实例数量后，页面重新生成 TypedArray、写入同一块 Storage Buffer，再记录一次 <code>draw(3, count)</code>。状态区同时显示 Draw Call 与实际上传字节数。</p>
        <StorageBufferPlayground />
      </section>

      <section id="vertex-pulling" className="lesson-section">
        <h2>Storage Buffer 也能主动索引顶点数据</h2>
        <p>Vertex Shader 可以使用 <code>vertex_index</code> 从 Storage Buffer 读取位置，这种路径称为 vertex pulling。它适合需要随机访问或自定义解码的数据；下一章会使用固定功能 Vertex Fetch 按布局顺序读取。</p>
        <CodeBlock language="wgsl" label="通过 vertex_index 拉取位置">{vertexPullingCode}</CodeBlock>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现展示分配、更新与销毁</h2>
        <p>核心文件包含记录生成、Storage Buffer 分配、Bind Group、实例绘制与清理。React 文件管理数量控件、异步初始化、Canvas resize 和设备丢失；共享 helper 提供错误编译信息与 Context 所有权保护。</p>
        <LessonSourcePanel title="存储缓冲区完整项目源码" description="多实例渲染核心、React 实验与共享 helper" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>先验证数量与限制，再提交命令</h2>
        <p>页面在生成 TypedArray 前检查 count 为 1–64 的整数，避免越过已经分配的运行时数组。Shader 编译错误与异步 Pipeline 错误进入状态区，AbortSignal 防止已卸载组件继续写状态。</p>
        <p>实验结束时销毁 Storage Buffer、解除 Canvas 配置并销毁 Device。<code>device.lost</code> 负责报告运行期失效；ResizeObserver 被停止后不再提交绘制。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>记录</strong>能够计算 count × 32 字节的上传范围。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>绑定</strong>能够说明 STORAGE usage 与 var&lt;storage, read&gt; 的对应关系。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>索引</strong>能够用 instance_index 找到当前实例记录。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>执行</strong>能够解释一次 draw 如何产生 3 × count 次 Vertex 调用。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="uniforms"><ArrowLeft aria-hidden="true" /> Uniforms</LessonLink>
        <div><h2>接下来</h2><p>Storage Buffer 让 Shader 主动索引数组。下一章改用 Vertex Buffer Layout 描述每条顶点记录，由固定功能 Vertex Fetch 自动提供 location 输入。</p></div>
        <LessonLink lessonId="vertex-buffers">顶点缓冲区 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
