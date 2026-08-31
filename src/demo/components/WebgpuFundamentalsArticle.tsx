import { ArrowRight, Box, Braces, CheckCircle2, Cpu, Database, Download, Layers3, MonitorUp, Send, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';

import { CodeBlock } from './CodeBlock';
import { ComputePlayground } from './ComputePlayground';
import { ExecutionFlow } from './ExecutionFlow';
import { FundamentalsSourcePanel } from './FundamentalsSourcePanel';
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

const projectSetupCode = `npm create vite@latest webgpu-chapter-01 -- --template vanilla-ts
cd webgpu-chapter-01
npm install
npm install --save-dev @webgpu/types
npm run dev`;

const webgpuTypesCode = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["@webgpu/types"]
  },
  "include": ["src"]
}`;

export function WebgpuFundamentalsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑">
          <span>学习 WebGPU</span><span aria-hidden="true">/</span><span>基础概念</span>
        </nav>
        <h1 id="lesson-title" tabIndex={-1}>WebGPU 基础</h1>
        <p className="lesson-lead">从零建立 WebGPU 心智模型，独立完成三角形渲染、GPU 数组计算、Canvas 尺寸同步、错误诊断和资源清理。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>WebGPU</li><li>Render + Compute</li><li>约 46 分钟</li></ul>
      </header>

      {toc}

      <WebgpuSupportNotice />

      <section id="chapter-contract" className="lesson-section">
        <h2>本章可以独立学习和运行</h2>
        <p>你只需要具备 TypeScript 基础、理解 Promise 与 TypedArray。本章会在首次出现时定义 WebGPU 对象，给出渲染和计算的完整输入、资源关系、命令顺序、输出观察方式以及清理逻辑。</p>
        <p>读完后，你应该能在一个空白 Vite 项目中复制完整源码，看到 Canvas 三角形和数组翻倍结果，并能根据状态区判断初始化、WGSL 编译或设备错误。</p>
        <ol className="pipeline" aria-label="第一章完整学习路径">
          <li><span><Database aria-hidden="true" /></span><strong>输入</strong><small>WGSL 字符串与 Float32Array</small></li>
          <li><span><Box aria-hidden="true" /></span><strong>资源</strong><small>Device、Buffer、Pipeline、Texture</small></li>
          <li><span><Send aria-hidden="true" /></span><strong>执行</strong><small>编码 Command Buffer 并提交 Queue</small></li>
          <li><span><CheckCircle2 aria-hidden="true" /></span><strong>验证</strong><small>Canvas 像素与 CPU 回读数组</small></li>
        </ol>
      </section>

      <section id="project-setup" className="lesson-section">
        <h2>先建立一个可以直接运行的 TypeScript 项目</h2>
        <p>使用 Vite 的 <code>vanilla-ts</code> 模板即可完成本章实验。WebGPU 只能在安全上下文中开放，本地的 <code>localhost</code> 和 <code>127.0.0.1</code> 可用于开发。</p>
        <CodeBlock label="创建第一章实验项目">{projectSetupCode}</CodeBlock>
        <p>项目安装 <code>@webgpu/types</code> 后，在 <code>tsconfig.json</code> 中声明类型包。这样编辑器和 TypeScript 能识别 GPUDevice、GPUBufferUsage、GPUCanvasContext 等接口。</p>
        <CodeBlock label="tsconfig.json">{webgpuTypesCode}</CodeBlock>
      </section>

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
        <div className="resource-role-grid">
          <article><Box aria-hidden="true" /><h3>GPUAdapter</h3><p>代表浏览器选中的物理或逻辑 GPU 适配器，并暴露 features 与 limits。</p></article>
          <article><Cpu aria-hidden="true" /><h3>GPUDevice</h3><p>创建资源、Pipeline 和 Encoder，也是 GPUQueue 的拥有者。</p></article>
          <article><MonitorUp aria-hidden="true" /><h3>GPUCanvasContext</h3><p>把 Device 连接到 Canvas，并提供当前帧的可呈现 Texture。</p></article>
          <article><Send aria-hidden="true" /><h3>GPUQueue</h3><p>接收 Command Buffer，也负责把 CPU 端小块数据写入 Buffer。</p></article>
        </div>
        <CodeBlock label="请求 WebGPU 设备">{requestDeviceCode}</CodeBlock>
        <p>这段代码位于完整 <code>render.ts</code> 的 <code>startTriangle()</code> 开头。成功得到 Device 后，程序才继续创建 Canvas Context 与 GPU 资源。</p>
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
        <p>完整程序会先配置 Canvas Context，再创建 Shader Module、读取编译信息，最后用相同 Module 组装 Render Pipeline。</p>
      </section>

      <section id="hello-triangle" className="lesson-section lesson-section--wide">
        <h2>编译并运行第一个三角形</h2>
        <p>顶点坐标暂时直接写在 WGSL 数组中，<code>@builtin(vertex_index)</code> 会为三次顶点调用提供 0、1、2。修改 <code>fragmentMain</code> 返回的四个颜色分量，然后点击“运行”，可以观察 Shader Module、Pipeline 和命令提交形成的完整运行链路。</p>
        <WebgpuTrianglePlayground />
      </section>

      <section id="command-flow" className="lesson-section lesson-section--wide">
        <h2>编码命令，再一次性提交</h2>
        <p><code>setPipeline</code> 与 <code>draw</code> 会把操作记录进命令编码器。<code>finish()</code> 产出不可再修改的 <code>GPUCommandBuffer</code>，随后 <code>queue.submit()</code> 把它交给 GPU 执行。这种结构让浏览器能够提前验证命令并高效安排工作。</p>
        <CodeBlock label="记录并提交绘制命令">{submitCode}</CodeBlock>
        <p>这组调用位于完整源码的 <code>render()</code> 函数中。每次重绘都会获取新的当前纹理、记录新的 Command Buffer 并提交。</p>
        <ExecutionFlow />
      </section>

      <section id="basic-compute" className="lesson-section lesson-section--wide">
        <h2>在 GPU 上进行计算</h2>
        <p>本章的第二个完整示例使用 Compute Shader 把数组中的每个数值乘以 2。输入先写入可读写 Storage Buffer；计算完成后，结果复制到带 <code>MAP_READ</code> 的 Buffer，再映射回 JavaScript。</p>
        <p><code>@workgroup_size(1)</code> 最容易看清“一个 invocation 处理一个索引”的关系。下面的交互实验使用每组 64 个 invocation，并加入越界检查；两种写法共享完全相同的 Buffer、Bind Group、dispatch、copy 和 map 数据路径。</p>
        <ol className="pipeline" aria-label="Compute Shader 数据路径">
          <li><span><Database aria-hidden="true" /></span><strong>Storage Buffer</strong><small>queue.writeBuffer 写入输入</small></li>
          <li><span><Cpu aria-hidden="true" /></span><strong>Compute Pass</strong><small>dispatchWorkgroups 执行 WGSL</small></li>
          <li><span><Download aria-hidden="true" /></span><strong>Readback Buffer</strong><small>copyBufferToBuffer 保存结果</small></li>
          <li><span><CheckCircle2 aria-hidden="true" /></span><strong>CPU 副本</strong><small>mapAsync、slice、unmap</small></li>
        </ol>
        <ComputePlayground />
      </section>

      <section id="canvas-resize" className="lesson-section">
        <h2>简要调整 Canvas 尺寸</h2>
        <p>CSS 尺寸只控制 Canvas 在页面中的显示面积。实际渲染纹理尺寸由 <code>canvas.width</code> 和 <code>canvas.height</code> 决定。ResizeObserver 读取容器尺寸，并把结果限制到 <code>maxTextureDimension2D</code> 范围内。</p>
        <CodeBlock label="基础 ResizeObserver 流程">{canvasResizeCode}</CodeBlock>
        <p>本项目的运行时代码还处理设备像素比、极端尺寸宽高比和 <code>device-pixel-content-box</code>，这些属于基础流程上的现代化补充。</p>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整可运行源码</h2>
        <p><code>index.html</code> 放在项目根目录，<code>src/render.ts</code> 包含从能力检查到清理的完整三角形程序，<code>src/compute.ts</code> 是独立可运行的数组翻倍程序。默认 HTML 引用 <code>./src/render.ts</code>，将 script 路径切换为 <code>./src/compute.ts</code> 即可单独运行计算示例。</p>
        <p>每份 TypeScript 都从全局 <code>navigator.gpu</code> 开始，未依赖站内封装。这样可以直接看到资源创建、binding、命令提交和输出读取的完整顺序。</p>
        <FundamentalsSourcePanel />
      </section>

      <section id="errors-cleanup" className="lesson-section">
        <h2>错误处理与资源清理属于主流程</h2>
        <p>能力检查区分 <code>navigator.gpu</code> 缺失、Adapter 获取失败和 Canvas Context 创建失败。Shader Module 创建后调用 <code>getCompilationInfo()</code>，把 WGSL 行列信息呈现到状态区；<code>device.lost</code> 则负责报告运行期间的设备失效。</p>
        <p>渲染程序停止时要断开 ResizeObserver、移除 window 监听、调用 <code>context.unconfigure()</code> 并销毁 Device。计算程序在 <code>finally</code> 中解除映射并销毁工作 Buffer、回读 Buffer 和 Device，确保成功与失败路径都能释放资源。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>用这张清单检查本章内容</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>初始化</strong>能够解释 navigator.gpu → Adapter → Device → Canvas Context。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>渲染</strong>能够追踪 WGSL → Shader Module → Pipeline → Render Pass → Canvas Texture。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>计算</strong>能够追踪 TypedArray → Storage Buffer → Compute Pass → Readback Buffer → CPU 副本。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>生命周期</strong>能够说明 ResizeObserver、device.lost、unmap、destroy 和 unconfigure 的时机。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps">
        <div><h2>接下来</h2><p>第一章已经独立完成 Render 与 Compute 两条路径。下一章只引入一个新概念：Vertex Shader 如何把数据传给 Fragment Shader。</p></div>
        <LessonLink className="next-steps__link" lessonId="wgsl-interstage">Inter-stage 变量 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
