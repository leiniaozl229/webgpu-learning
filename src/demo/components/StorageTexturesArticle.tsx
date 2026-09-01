import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Grid3X3,
  MonitorUp,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';

import runtimeSource from '../../core/textureRuntime.ts?raw';
import storageTextureCoreSource from '../../core/storageTextures.ts?raw';
import playgroundSource from './StorageTexturePlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { StorageTexturePlayground } from './StorageTexturePlayground';

const storageBindingCode = `const texture = device.createTexture({
  size: [256, 256],
  format: 'rgba8unorm',
  usage: GPUTextureUsage.STORAGE_BINDING
    | GPUTextureUsage.TEXTURE_BINDING,
});

// WGSL
@group(0) @binding(0)
var outputTexture: texture_storage_2d<rgba8unorm, write>;`;

const computeRenderCode = `const encoder = device.createCommandEncoder();

const computePass = encoder.beginComputePass();
computePass.setPipeline(computePipeline);
computePass.setBindGroup(0, computeBindGroup);
computePass.dispatchWorkgroups(32, 32);
computePass.end();

const renderPass = encoder.beginRenderPass(renderPassDescriptor);
renderPass.setPipeline(renderPipeline);
renderPass.setBindGroup(0, renderBindGroup);
renderPass.draw(6);
renderPass.end();

device.queue.submit([encoder.finish()]);`;

const sourceFiles = [
  { id: 'core', label: 'core/storageTextures.ts', code: storageTextureCoreSource },
  { id: 'playground', label: 'StorageTexturePlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function StorageTexturesArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="textures">纹理</LessonLink><span aria-hidden="true">/</span><span>GPU 写入纹理</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>存储纹理</h1>
        <p className="lesson-lead">让 Compute Shader 用 textureStore 写入 rgba8unorm Storage Texture，再在后续 Render Pass 中采样同一个 Texture View。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>Storage Texture</li><li>Compute → Render</li><li>约 34 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="storage-texture-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Cpu /></div>
        <div><h2 id="storage-texture-learn-heading">本章输入是 256 × 256 个全局调用 ID</h2><ul><li>Compute Pass 派发 32 × 32 个工作组</li><li>每组 8 × 8 个 invocation，共覆盖 65,536 个 texel</li><li>Texture 同时声明 STORAGE_BINDING 与 TEXTURE_BINDING</li><li>一个 Command Buffer 依次记录 Compute Pass 与 Render Pass</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>同一 Texture 先作为输出，随后作为输入</h2>
        <ol className="pipeline" aria-label="Storage Texture Compute 到 Render 数据路径">
          <li><span><Cpu aria-hidden="true" /></span><strong>Compute invocation</strong><small>global_invocation_id 定位目标 texel</small></li>
          <li><span><Grid3X3 aria-hidden="true" /></span><strong>Storage Texture</strong><small>textureStore 写入 rgba8unorm</small></li>
          <li><span><Workflow aria-hidden="true" /></span><strong>Render Pass</strong><small>后续命令把同一 View 当作 sampled texture</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Fragment Shader 显示生成图案</small></li>
        </ol>
      </section>

      <section id="storage-binding" className="lesson-section">
        <h2>格式、访问模式和 usage 必须完全匹配</h2>
        <p>WGSL 声明 <code>texture_storage_2d&lt;rgba8unorm, write&gt;</code>，JavaScript 创建相同格式的 Texture，并加入 <code>STORAGE_BINDING</code>。后续需要采样，因此同时加入 <code>TEXTURE_BINDING</code>。</p>
        <CodeBlock label="创建可写、可采样的 Storage Texture">{storageBindingCode}</CodeBlock>
        <p>Storage Texture 直接按整数 texel 坐标读写，不使用 Sampler。Compute Shader 先用 <code>textureDimensions()</code> 做越界检查，再调用 <code>textureStore()</code>。</p>
      </section>

      <section id="compute-flow" className="lesson-section">
        <h2>编码顺序形成 Compute 到 Render 的依赖</h2>
        <p>Compute Pass 结束后，Render Pass 才会读取 Texture。两个 Pass 记录在同一 Command Encoder 中，WebGPU 根据 usage 自动处理资源状态；<code>finish()</code> 之后一次提交完整链路。</p>
        <CodeBlock label="同一 Command Buffer 中先计算再绘制">{computeRenderCode}</CodeBlock>
      </section>

      <section id="storage-texture-lab" className="lesson-section lesson-section--wide">
        <h2>让 65,536 个 invocation 生成图案</h2>
        <p>拖动 phase 会更新 16 字节 Uniform，重新派发 Compute，再立即采样结果。Texture、两个 Pipeline 与两个 Bind Group 都保持复用。</p>
        <StorageTexturePlayground />
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现并列展示两个 Shader 阶段</h2>
        <p>核心文件包含 Compute WGSL、Render WGSL、Storage Texture、两个 Pipeline、两个 Pass 和资源清理；React 文件管理 phase 与 resize；共享 runtime 负责设备和编译信息。</p>
        <LessonSourcePanel title="存储纹理完整项目源码" description="Compute + Render 核心、交互组件与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>格式能力与派发边界需要验证</h2>
        <p>Pipeline 创建会检查 storage format 与 access 是否有效；Shader 通过纹理尺寸判断 global ID，防止工作组向上取整时越界。两个 Shader Module 的完整编译信息都会显示。</p>
        <p>组件卸载时销毁 Settings Buffer 与 Storage Texture，再释放 Canvas Context 和 Device。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>usage</strong>能够说明同一 Texture 为什么需要两种 usage。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>派发</strong>能够计算 256 ÷ 8 = 32 个工作组。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>顺序</strong>能够复述 Compute Pass → Render Pass → submit。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>去向</strong>能够追踪 textureStore 到 Canvas 像素。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="cube-maps"><ArrowLeft aria-hidden="true" /> 立方体贴图</LessonLink>
        <div><h2>接下来</h2><p>当前每个 Canvas 像素只有一个颜色样本。下一章让每个逻辑像素保存 4 个覆盖样本，再 resolve 到可呈现纹理。</p></div>
        <LessonLink lessonId="msaa">多重采样 / MSAA <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
