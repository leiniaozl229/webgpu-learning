import { ArrowRight, Box, Braces, Cpu, Layers3, Send, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { ComputePlayground } from './ComputePlayground';
import { ExecutionFlow } from './ExecutionFlow';
import { LessonLink } from './LessonLink';
import { WebgpuSupportNotice } from './WebgpuSupportNotice';
import { WebgpuTrianglePlayground } from './WebgpuTrianglePlayground';

const requestDeviceCode = `if (!navigator.gpu) {
  throw new Error('当前浏览器没有暴露 WebGPU');
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('没有可用的 GPUAdapter');

const device = await adapter.requestDevice();`;

const pipelineCode = `const shaderModule = device.createShaderModule({
  label: 'triangle shaders',
  code: shaderSource,
});

const pipeline = await device.createRenderPipelineAsync({
  label: 'triangle pipeline',
  layout: 'auto',
  vertex: { module: shaderModule, entryPoint: 'vertexMain' },
  fragment: {
    module: shaderModule,
    entryPoint: 'fragmentMain',
    targets: [{ format }],
  },
});`;

const submitCode = `const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass(renderPassDescriptor);
pass.setPipeline(pipeline);
pass.draw(3);
pass.end();

const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);`;

const canvasResizeCode = `const observer = new ResizeObserver((entries) => {
  const entry = entries[0];
  const width = entry.contentBoxSize[0].inlineSize;
  const height = entry.contentBoxSize[0].blockSize;

  canvas.width = Math.max(
    1,
    Math.min(width, device.limits.maxTextureDimension2D),
  );
  canvas.height = Math.max(
    1,
    Math.min(height, device.limits.maxTextureDimension2D),
  );
  render();
});

observer.observe(canvas);`;

export function WebgpuFundamentalsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑">
          <span>学习 WebGPU</span><span aria-hidden="true">/</span><span>基础概念</span>
        </nav>
        <h1 id="lesson-title" tabIndex={-1}>WebGPU 基础</h1>
        <p className="lesson-lead">按照当前基础教程，先建立三类 Shader 与命令缓冲区的心智模型，再完成三角形渲染、GPU 计算和 Canvas 尺寸同步。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGPU</li><li>Render + Compute</li><li>约 34 分钟</li></ul>
      </header>

      {toc}

      <WebgpuSupportNotice />

      <section className="learning-note" aria-labelledby="learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Layers3 /></div>
        <div>
          <h2 id="learn-heading">你将理解</h2>
          <ul>
            <li>GPUAdapter 与 GPUDevice 分别代表哪一层能力</li>
            <li>WGSL 函数怎样进入 Render Pipeline</li>
            <li>Render Pass 如何选择画布纹理并记录绘制命令</li>
            <li>Compute Shader 如何读写 Storage Buffer 并回传结果</li>
            <li>Canvas 显示尺寸如何同步到实际纹理尺寸</li>
          </ul>
        </div>
      </section>

      <section id="what-webgpu-does" className="lesson-section">
        <h2>WebGPU 能做什么</h2>
        <p>WebGPU 向网页提供两类核心能力：把点、线和三角形绘制到纹理，以及让计算着色器并行处理数据。Canvas 会提供当前帧的纹理，因此最小绘图示例也遵循“写入纹理”这条规则。</p>
        <div className="webgpu-purpose-grid">
          <article><span aria-hidden="true"><Waypoints /></span><h3>Render</h3><p>Vertex Shader 计算位置，Fragment Shader 计算写入渲染目标的数据。</p></article>
          <article><span aria-hidden="true"><Cpu /></span><h3>Compute</h3><p>Compute Shader 按工作组并行执行，把结果写回 Buffer 或 Storage Texture。</p></article>
        </div>
      </section>

      <section id="getting-started" className="lesson-section">
        <h2>起步：GPU 运行三类 Shader</h2>
        <p>Vertex Shader 计算顶点位置，Fragment Shader 计算写入渲染目标的数据，Compute Shader 负责通用并行计算。JavaScript 需要先请求 Adapter 与 Device，随后才能创建 Shader Module、Buffer、Texture 和 Pipeline。</p>
        <p><code>GPUAdapter</code> 描述浏览器选中的图形适配器及其能力。<code>GPUDevice</code> 是创建资源和编码命令的主要入口。请求过程是异步的，页面需要逐层检查结果并保留可读错误。</p>
        <CodeBlock label="请求 WebGPU 设备">{requestDeviceCode}</CodeBlock>
      </section>

      <section id="render-pipeline" className="lesson-section">
        <h2>Pipeline 固化着色器与渲染状态</h2>
        <p>WGSL 源码先进入 <code>GPUShaderModule</code>。Render Pipeline 再选择顶点和片段入口、渲染目标格式、图元拓扑等状态。大部分 Pipeline 状态创建后保持不变，渲染时只需选择已经准备好的对象。</p>
        <ol className="pipeline" aria-label="WebGPU 最小渲染流水线">
          <li><span><Braces aria-hidden="true" /></span><strong>WGSL Module</strong><small>vertexMain + fragmentMain</small></li>
          <li><span><Box aria-hidden="true" /></span><strong>Render Pipeline</strong><small>入口函数 + 目标格式</small></li>
          <li><span><Layers3 aria-hidden="true" /></span><strong>Render Pass</strong><small>当前 Canvas Texture</small></li>
          <li><span><Send aria-hidden="true" /></span><strong>GPUQueue</strong><small>提交 CommandBuffer</small></li>
        </ol>
        <CodeBlock label="创建渲染管线">{pipelineCode}</CodeBlock>
      </section>

      <section id="hello-triangle" className="lesson-section lesson-section--wide">
        <h2>编译并运行第一个三角形</h2>
        <p>顶点坐标暂时直接写在 WGSL 数组中，<code>@builtin(vertex_index)</code> 会为三次顶点调用提供 0、1、2。修改 <code>fragmentMain</code> 返回的四个颜色分量，然后点击“运行”，可以观察 Shader Module、Pipeline 和命令提交形成的完整闭环。</p>
        <WebgpuTrianglePlayground />
      </section>

      <section id="command-flow" className="lesson-section lesson-section--wide">
        <h2>编码命令，再一次性提交</h2>
        <p><code>setPipeline</code> 与 <code>draw</code> 会把操作记录进命令编码器。<code>finish()</code> 产出不可再修改的 <code>GPUCommandBuffer</code>，随后 <code>queue.submit()</code> 把它交给 GPU 执行。这种结构让浏览器能够提前验证命令并高效安排工作。</p>
        <CodeBlock label="记录并提交绘制命令">{submitCode}</CodeBlock>
        <ExecutionFlow />
      </section>

      <section id="basic-compute" className="lesson-section lesson-section--wide">
        <h2>在 GPU 上进行计算</h2>
        <p>基础教程的第二个闭环使用 Compute Shader 把数组中的每个数值乘以 2。输入先写入可读写 Storage Buffer；计算完成后，结果复制到带 <code>MAP_READ</code> 的 Buffer，再映射回 JavaScript。</p>
        <p>参考页先使用 <code>@workgroup_size(1)</code> 展示最小调用模型。下面的实验沿用相同数据路径，并把工作组扩展到 64 个 invocation，同时加入越界检查，为后续“计算着色器基础”课程做准备。</p>
        <ComputePlayground />
      </section>

      <section id="canvas-resize" className="lesson-section">
        <h2>简要调整 Canvas 尺寸</h2>
        <p>CSS 尺寸只控制 Canvas 在页面中的显示面积。实际渲染纹理尺寸由 <code>canvas.width</code> 和 <code>canvas.height</code> 决定。ResizeObserver 读取容器尺寸，并把结果限制到 <code>maxTextureDimension2D</code> 范围内。</p>
        <CodeBlock label="基础 ResizeObserver 流程">{canvasResizeCode}</CodeBlock>
        <p>本项目的运行时代码还处理设备像素比、极端尺寸宽高比和 <code>device-pixel-content-box</code>，这些属于基础流程上的现代化补充。</p>
      </section>

      <section id="next-steps" className="next-steps">
        <div><h2>接下来</h2><p>当前教程接着按 Inter-stage、Uniform、Storage Buffer、Vertex Buffer 与纹理的顺序讲解 Shader 数据传递。</p></div>
        <LessonLink className="next-steps__link" lessonId="wgsl-interstage">Inter-stage 变量 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
