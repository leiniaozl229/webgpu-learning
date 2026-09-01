import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Grid3X3,
  Link2,
  MonitorUp,
  Pipette,
  Send,
} from 'lucide-react';
import type { ReactNode } from 'react';

import textureCoreSource from '../../core/textures.ts?raw';
import runtimeSource from '../../core/textureRuntime.ts?raw';
import playgroundSource from './TextureBasicsPlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { TextureBasicsPlayground } from './TextureBasicsPlayground';

const createTextureCode = `const texture = device.createTexture({
  label: '8 × 8 color texture',
  size: [8, 8],
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

device.queue.writeTexture(
  { texture },
  rgbaBytes,
  { bytesPerRow: 8 * 4 },
  { width: 8, height: 8 },
);`;

const bindingCode = `@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var colorTexture: texture_2d<f32>;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSample(colorTexture, textureSampler, input.uv);
}`;

const sourceFiles = [
  { id: 'core', label: 'core/textures.ts', code: textureCoreSource },
  { id: 'playground', label: 'TextureBasicsPlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function TexturesArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>纹理</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>纹理基础</h1>
        <p className="lesson-lead">把二维 RGBA 字节上传为 GPUTexture，用 Texture View 与 Sampler 组成 Bind Group，再通过插值 UV 在 Fragment Shader 中采样。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>GPUTexture</li><li>Sampler</li><li>约 34 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="textures-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Grid3X3 /></div>
        <div><h2 id="textures-learn-heading">本章输入是一张 8 × 8 RGBA 网格</h2><ul><li>JavaScript 用 Uint8Array 保存 64 个 texel</li><li><code>rgba8unorm</code> 把 0–255 映射为 Shader 中的 0–1</li><li>Texture View 描述被绑定的子资源范围</li><li>Sampler 决定边界寻址与放大、缩小过滤</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>Texture 把二维数据交给专用采样硬件</h2>
        <ol className="pipeline" aria-label="纹理采样数据路径">
          <li><span><Grid3X3 aria-hidden="true" /></span><strong>Uint8Array</strong><small>8 × 8 × RGBA，共 256 字节</small></li>
          <li><span><Send aria-hidden="true" /></span><strong>GPUTexture</strong><small>queue.writeTexture 上传 texel</small></li>
          <li><span><Pipette aria-hidden="true" /></span><strong>Sampler</strong><small>根据 UV 执行寻址与过滤</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Fragment 输出采样颜色</small></li>
        </ol>
      </section>

      <section id="texture-resource" className="lesson-section">
        <h2>size、format 与 usage 定义纹理能力</h2>
        <p><code>size: [8, 8]</code> 分配二维 texel 网格，<code>rgba8unorm</code> 为每个通道保存 8 位无符号归一化值。<code>TEXTURE_BINDING</code> 允许 Shader 读取，<code>COPY_DST</code> 允许 Queue 写入。</p>
        <CodeBlock label="创建并上传 rgba8unorm 纹理">{createTextureCode}</CodeBlock>
        <p><code>bytesPerRow: 32</code> 表示 CPU 数据每行跨度。上传完成后创建默认 Texture View，把完整 mip level 0 暴露给 Bind Group。</p>
      </section>

      <section id="sampler-binding" className="lesson-section">
        <h2>Texture 保存数据，Sampler 定义读取策略</h2>
        <div className="binding-grid">
          <article><Grid3X3 aria-hidden="true" /><h3>binding 1</h3><code>texture_2d&lt;f32&gt;</code><p>提供二维采样数据与格式转换结果。</p></article>
          <article><Pipette aria-hidden="true" /><h3>binding 0</h3><code>sampler</code><p>控制 repeat、clamp、nearest 与 linear。</p></article>
          <article><Link2 aria-hidden="true" /><h3>location 0</h3><code>uv: vec2f</code><p>由 Vertex Shader 输出并在三角形内插值。</p></article>
        </div>
        <CodeBlock language="wgsl" label="在 Fragment Shader 中采样">{bindingCode}</CodeBlock>
      </section>

      <section id="texture-lab" className="lesson-section lesson-section--wide">
        <h2>观察寻址与过滤的差异</h2>
        <p>四边形 UV 延伸到 −0.35–2.35，因此边界策略会直接改变输出。切换 nearest 与 linear 可以看到单个 texel 和相邻 texel 混合后的区别。</p>
        <TextureBasicsPlayground />
      </section>

      <section id="command-flow" className="lesson-section">
        <h2>上传发生一次，采样发生在每个片段</h2>
        <p><code>queue.writeTexture()</code> 在初始化时上传 256 字节。每次 Render Pass 设置 Pipeline 与 Bind Group，<code>draw(6)</code> 生成两个三角形；Fragment Shader 为覆盖到的每个片段调用 <code>textureSample()</code>。</p>
        <p>修改 Sampler 时 GPUTexture 与 Pipeline 继续复用。页面只创建新的 Sampler、Bind Group 和 Command Buffer。</p>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现包含资源生命周期</h2>
        <p>核心文件包含 texel 生成、Texture、Sampler、Bind Group 与绘制；React 文件管理控件、异步初始化和 Canvas resize；共享 runtime 处理 Adapter、Device、WGSL 编译、Context 所有权与清理。</p>
        <LessonSourcePanel title="纹理基础完整项目源码" description="采样核心、交互组件与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>尺寸、格式和绑定错误都要显式呈现</h2>
        <p>Shader Module 创建后读取完整 compilation info，Pipeline 使用异步创建接口。Canvas 尺寸限制到 <code>maxTextureDimension2D</code>，每帧重新获取当前 Canvas Texture。</p>
        <p>组件卸载时停止 ResizeObserver、销毁颜色 Texture、解除 Canvas 配置并销毁 Device；设备丢失原因进入实验状态区。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>输入</strong>能够计算 8 × 8 × 4 = 256 字节。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>资源</strong>能够解释 TEXTURE_BINDING 与 COPY_DST。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>绑定</strong>能够把 sampler、texture 和 UV 接到 textureSample。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>输出</strong>能够说明寻址和过滤为何改变 Canvas 像素。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="vertex-buffers"><ArrowLeft aria-hidden="true" /> 顶点缓冲区</LessonLink>
        <div><h2>接下来</h2><p>当前 texel 来自 TypedArray。下一章使用 fetch、ImageBitmap 与 copyExternalImageToTexture 加载浏览器图像源。</p></div>
        <LessonLink lessonId="image-textures">加载图像 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
