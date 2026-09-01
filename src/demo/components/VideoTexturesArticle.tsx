import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Film,
  Link2,
  MonitorUp,
  RefreshCw,
} from 'lucide-react';
import type { ReactNode } from 'react';

import runtimeSource from '../../core/textureRuntime.ts?raw';
import videoTextureCoreSource from '../../core/videoTextures.ts?raw';
import playgroundSource from './VideoTexturePlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { VideoTexturePlayground } from './VideoTexturePlayground';

const externalWgslCode = `@group(0) @binding(0) var videoSampler: sampler;
@group(0) @binding(1) var videoTexture: texture_external;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  return textureSampleBaseClampToEdge(
    videoTexture,
    videoSampler,
    input.uv,
  );
}`;

const frameImportCode = `function renderVideoFrame() {
  const externalTexture = device.importExternalTexture({
    source: video,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: sampler },
      { binding: 1, resource: externalTexture },
    ],
  });

  encodeAndSubmit(bindGroup);
  requestAnimationFrame(renderVideoFrame);
}`;

const sourceFiles = [
  { id: 'core', label: 'core/videoTextures.ts', code: videoTextureCoreSource },
  { id: 'playground', label: 'VideoTexturePlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function VideoTexturesArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="textures">纹理</LessonLink><span aria-hidden="true">/</span><span>动态外部源</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>高效使用视频</h1>
        <p className="lesson-lead">把 HTMLVideoElement 的当前帧导入 GPUExternalTexture，在 Fragment Shader 中直接采样浏览器维护的视频表示，并在下一帧重新导入。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>GPUExternalTexture</li><li>Video Frame</li><li>约 32 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="video-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Film /></div>
        <div><h2 id="video-learn-heading">本章输入是正在播放的 HTMLVideoElement</h2><ul><li>实验用 Canvas captureStream 在本地生成视频帧</li><li><code>importExternalTexture()</code> 包装当前视频快照</li><li>WGSL 使用 <code>texture_external</code> 与专用采样函数</li><li>暂停或卸载时停止动画、视频与全部 MediaStreamTrack</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>视频帧可以绕过常规 RGBA Texture 复制</h2>
        <ol className="pipeline" aria-label="GPUExternalTexture 视频数据路径">
          <li><span><Film aria-hidden="true" /></span><strong>HTMLVideoElement</strong><small>浏览器提供当前解码帧</small></li>
          <li><span><RefreshCw aria-hidden="true" /></span><strong>GPUExternalTexture</strong><small>每帧在当前 JavaScript 任务中导入</small></li>
          <li><span><Link2 aria-hidden="true" /></span><strong>Frame Bind Group</strong><small>绑定当前外部纹理与 Sampler</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>专用采样函数返回 RGBA</small></li>
        </ol>
      </section>

      <section id="external-contract" className="lesson-section">
        <h2>External Texture 有三条专用约定</h2>
        <div className="resource-role-grid">
          <article><Clock3 aria-hidden="true" /><h3>短生命周期</h3><p>从 HTMLVideoElement 导入的对象会在任务结束后过期，下一帧需要重新导入。</p></article>
          <article><Film aria-hidden="true" /><h3>texture_external</h3><p>Shader binding 类型专门描述浏览器提供的视频表示。</p></article>
          <article><MonitorUp aria-hidden="true" /><h3>BaseClampToEdge</h3><p>采样 base level 并钳制边缘，不提供 mipmap 与 repeat。</p></article>
        </div>
        <CodeBlock language="wgsl" label="External Texture WGSL 接口">{externalWgslCode}</CodeBlock>
      </section>

      <section id="frame-loop" className="lesson-section">
        <h2>每个视频帧重新导入并绑定</h2>
        <p>Sampler 与 Pipeline 可以复用。当前帧到达后调用 <code>importExternalTexture()</code>，用返回对象创建 Bind Group，记录 Render Pass 并提交；下一帧重复这段短路径。</p>
        <CodeBlock label="逐帧导入 External Texture">{frameImportCode}</CodeBlock>
        <p>生产应用可以用 <code>requestVideoFrameCallback()</code> 对齐解码帧率。本实验用 requestAnimationFrame 同时驱动 Canvas MediaStream 源和 WebGPU 输出，便于直接观察两侧画面。</p>
      </section>

      <section id="video-lab" className="lesson-section lesson-section--wide">
        <h2>启动一条完全本地的视频纹理链路</h2>
        <p>点击启动后，二维 Canvas 产生运动画面，captureStream 把它连接到 Video，WebGPU 再逐帧导入。整个实验不会请求摄像头权限，也不会下载外部视频。</p>
        <VideoTexturePlayground />
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现同时管理 GPU 与媒体资源</h2>
        <p>核心文件包含 External Texture Shader、逐帧 Bind Group 与命令提交；React 文件负责 Canvas MediaStream、Video 播放、动画循环、启动和暂停；共享 runtime 管理 Device 与 Context。</p>
        <LessonSourcePanel title="高效使用视频完整项目源码" description="External Texture 核心、媒体实验与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>媒体状态与 GPU 状态要分别检查</h2>
        <p>导入前确认 Video 至少拥有当前帧；播放失败、2D Canvas 缺失、WGSL 编译错误和设备丢失都会进入状态区。用户点击启动提供明确的媒体播放时机。</p>
        <p>卸载时取消动画帧、暂停 Video、清空 srcObject、停止全部 MediaStreamTrack，并释放 WebGPU Runtime。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>来源</strong>能够指出 HTMLVideoElement 当前帧的来源。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>类型</strong>能够配对 texture_external 与 textureSampleBaseClampToEdge。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>逐帧</strong>能够解释为何每个任务重新导入并创建 Bind Group。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>清理</strong>能够停止动画、视频、媒体轨道和 Device。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="image-textures"><ArrowLeft aria-hidden="true" /> 加载图像</LessonLink>
        <div><h2>接下来</h2><p>二维 Texture 使用 vec2 UV。下一章把六个二维层组合成 cube view，并用 vec3 方向向量采样。</p></div>
        <LessonLink lessonId="cube-maps">立方体贴图 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
