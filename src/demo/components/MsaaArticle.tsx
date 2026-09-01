import {
  ArrowLeft,
  CheckCircle2,
  Combine,
  Grid3X3,
  MonitorUp,
  ScanLine,
} from 'lucide-react';
import type { ReactNode } from 'react';

import msaaCoreSource from '../../core/msaa.ts?raw';
import runtimeSource from '../../core/textureRuntime.ts?raw';
import playgroundSource from './MsaaPlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { MsaaPlayground } from './MsaaPlayground';

const pipelineCode = `const pipeline = await device.createRenderPipelineAsync({
  layout: 'auto',
  vertex: { module, entryPoint: 'vertexMain' },
  fragment: {
    module,
    entryPoint: 'fragmentMain',
    targets: [{ format }],
  },
  multisample: { count: 4 },
});`;

const textureCode = `const multisampleTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  sampleCount: 4,
  format,
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});`;

const resolveCode = `colorAttachments: [{
  view: multisampleTexture.createView(),
  resolveTarget: context.getCurrentTexture().createView(),
  clearValue,
  loadOp: 'clear',
  storeOp: 'discard',
}]`;

const sourceFiles = [
  { id: 'core', label: 'core/msaa.ts', code: msaaCoreSource },
  { id: 'playground', label: 'MsaaPlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function MsaaArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="textures">纹理</LessonLink><span aria-hidden="true">/</span><span>渲染附件</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>多重采样 / MSAA</h1>
        <p className="lesson-lead">让每个逻辑像素保存四个覆盖样本，在 Render Pass 结束时 resolve 成单样本 Canvas Texture，改善几何边缘锯齿。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>4× MSAA</li><li>Resolve Target</li><li>约 30 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="msaa-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><ScanLine /></div>
        <div><h2 id="msaa-learn-heading">本章输入是一条细斜线的覆盖结果</h2><ul><li>左右 Canvas 使用完全相同的 WGSL 与几何</li><li>左侧 Pipeline sampleCount 为 1</li><li>右侧 Pipeline 与临时颜色 Texture sampleCount 均为 4</li><li>多采样结果通过 resolveTarget 合并进当前 Canvas Texture</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>MSAA 增加覆盖样本，不增加 Shader 输出附件</h2>
        <ol className="pipeline" aria-label="MSAA resolve 数据路径">
          <li><span><ScanLine aria-hidden="true" /></span><strong>Triangle coverage</strong><small>每个逻辑像素测试 4 个样本位置</small></li>
          <li><span><Grid3X3 aria-hidden="true" /></span><strong>4× color Texture</strong><small>每像素保存四份颜色样本</small></li>
          <li><span><Combine aria-hidden="true" /></span><strong>Resolve</strong><small>Render Pass 结束时合并为单样本颜色</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>浏览器呈现最终像素</small></li>
        </ol>
      </section>

      <section id="sample-count" className="lesson-section">
        <h2>Pipeline 与颜色附件必须使用相同 sampleCount</h2>
        <p>多采样状态属于 Render Pipeline。设置 <code>multisample.count: 4</code> 后，Render Pass 的颜色附件也必须是 sampleCount 4、尺寸与 format 相同的 Texture。</p>
        <CodeBlock label="创建 4× MSAA Pipeline">{pipelineCode}</CodeBlock>
        <CodeBlock label="按 Canvas 尺寸创建多采样颜色 Texture">{textureCode}</CodeBlock>
        <p>Canvas resize 后旧的多采样 Texture 尺寸失效，页面会销毁并重新创建；Pipeline 仍可复用。</p>
      </section>

      <section id="resolve-flow" className="lesson-section">
        <h2>resolveTarget 接收单样本结果</h2>
        <p>多采样 Texture 作为实际 color attachment，当前 Canvas Texture View 放在 <code>resolveTarget</code>。合并完成后临时样本无需保留，因此 <code>storeOp</code> 使用 discard。</p>
        <CodeBlock label="配置多采样附件与 resolveTarget">{resolveCode}</CodeBlock>
      </section>

      <section id="msaa-lab" className="lesson-section lesson-section--wide">
        <h2>放大观察 1× 与 4× 的边缘</h2>
        <p>调整细线角度，观察左右边缘像素。4× MSAA 会根据四个覆盖样本的结果产生更平滑的过渡；两侧绘制命令在同一个 Command Buffer 中提交。</p>
        <MsaaPlayground />
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现管理两个 Canvas 与临时附件</h2>
        <p>核心文件包含两套 Pipeline、两个 Canvas Context、多采样 Texture 的尺寸缓存、resolve 与清理；React 文件管理角度控件与双 Canvas resize；共享 runtime 管理 Device。</p>
        <LessonSourcePanel title="MSAA 完整项目源码" description="双 Canvas 对比核心、交互组件与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>sampleCount 不一致会在编码阶段失败</h2>
        <p>Pipeline、颜色附件和 resolveTarget 的格式、尺寸与 sampleCount 受到 WebGPU 验证。页面通过固定的 1 与 4 组合保持兼容，并展示 Shader 与异步 Pipeline 错误。</p>
        <p>Resize 时先销毁旧多采样 Texture；组件卸载时释放 Uniform Buffer、两个 Canvas Context、临时 Texture 与 Device。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>样本</strong>能够区分逻辑像素与四个覆盖样本。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>匹配</strong>能够配对 Pipeline 与颜色 Texture 的 sampleCount。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>Resolve</strong>能够指出临时多采样 Texture 和最终 Canvas Texture。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>Resize</strong>能够说明为何尺寸变化后必须重建附件。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="storage-textures"><ArrowLeft aria-hidden="true" /> 存储纹理</LessonLink>
        <div><h2>纹理组完成</h2><p>你已经走通 TypedArray、浏览器图像、视频外部纹理、Cube Map、Storage Texture 和 MSAA Render Attachment 六条路径。</p></div>
      </section>
    </article>
  );
}
