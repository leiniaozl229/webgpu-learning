import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  MonitorUp,
  ScanLine,
  Send,
} from 'lucide-react';
import type { ReactNode } from 'react';

import imageTextureCoreSource from '../../core/imageTextures.ts?raw';
import runtimeSource from '../../core/textureRuntime.ts?raw';
import playgroundSource from './ImageTexturePlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { ImageTexturePlayground } from './ImageTexturePlayground';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';

const decodeCode = `const response = await fetch(imageUrl, { signal });
if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

const blob = await response.blob();
const objectUrl = URL.createObjectURL(blob);
const image = new Image();
image.src = objectUrl;
await image.decode();
const bitmap = await createImageBitmap(image);
URL.revokeObjectURL(objectUrl);`;

const externalCopyCode = `const texture = device.createTexture({
  size: [bitmap.width, bitmap.height],
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING
    | GPUTextureUsage.COPY_DST
    | GPUTextureUsage.RENDER_ATTACHMENT,
});

device.queue.copyExternalImageToTexture(
  { source: bitmap, flipY },
  { texture },
  { width: bitmap.width, height: bitmap.height },
);`;

const sourceFiles = [
  { id: 'core', label: 'core/imageTextures.ts', code: imageTextureCoreSource },
  { id: 'playground', label: 'ImageTexturePlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function ImageTexturesArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="textures">纹理</LessonLink><span aria-hidden="true">/</span><span>浏览器图像源</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>加载图像</h1>
        <p className="lesson-lead">通过 fetch 获取图像字节，交给浏览器解码成 ImageBitmap，再使用 copyExternalImageToTexture 把像素复制进可采样 GPUTexture。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>ImageBitmap</li><li>External Copy</li><li>约 30 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="image-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><ImageIcon /></div>
        <div><h2 id="image-learn-heading">本章输入是浏览器能够解码的图像</h2><ul><li>示例资源是随站点发布的 640 × 400 SVG</li><li>fetch 与 Blob 负责网络字节，ImageBitmap 负责解码结果</li><li>GPUTexture 尺寸必须匹配复制范围并满足设备限制</li><li>组件卸载时中止 fetch、关闭 ImageBitmap 并销毁 Texture</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>浏览器解码和 GPU 复制是两个边界</h2>
        <ol className="pipeline" aria-label="加载图像到纹理的数据路径">
          <li><span><Download aria-hidden="true" /></span><strong>fetch + Blob</strong><small>取得压缩或矢量图像字节</small></li>
          <li><span><ImageIcon aria-hidden="true" /></span><strong>ImageBitmap</strong><small>浏览器完成图像解码</small></li>
          <li><span><Send aria-hidden="true" /></span><strong>GPUTexture</strong><small>Queue 复制外部图像像素</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Sampler 在 Fragment Shader 中读取</small></li>
        </ol>
      </section>

      <section id="decode-copy" className="lesson-section">
        <h2>先得到 ImageBitmap，再按真实尺寸分配 Texture</h2>
        <p><code>fetch()</code> 可以接收 AbortSignal，HTTP 状态需要显式检查。SVG Blob 先由 HTMLImageElement 解码，再生成 ImageBitmap；Bitmap 宽高随后用于 Texture 的 size 与复制范围。</p>
        <CodeBlock label="获取并解码图像">{decodeCode}</CodeBlock>
        <p><code>copyExternalImageToTexture()</code> 是 GPUQueue 的即时复制接口。目标 Texture 同时声明采样、复制和外部图像复制所需的 Render Attachment usage。</p>
        <CodeBlock label="复制 ImageBitmap 到 GPUTexture">{externalCopyCode}</CodeBlock>
      </section>

      <section id="orientation-color" className="lesson-section">
        <h2>方向与颜色语义在复制时确定</h2>
        <div className="resource-role-grid">
          <article><ScanLine aria-hidden="true" /><h3>flipY</h3><p>在复制外部图像时翻转源数据的 Y 方向，适配不同 UV 约定。</p></article>
          <article><ImageIcon aria-hidden="true" /><h3>ImageBitmap</h3><p>保留浏览器解码后的宽高与像素内容，使用结束后调用 close。</p></article>
          <article><MonitorUp aria-hidden="true" /><h3>rgba8unorm</h3><p>Sampler 返回 f32 颜色，页面最终写入当前 Canvas Texture。</p></article>
        </div>
      </section>

      <section id="image-lab" className="lesson-section lesson-section--wide">
        <h2>对照原图与 GPU 采样结果</h2>
        <p>左侧展示浏览器直接渲染的 SVG，右侧展示复制到 GPUTexture 后的真实 WebGPU 输出。打开 flipY 可以观察复制方向发生变化。</p>
        <ImageTexturePlayground />
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现覆盖网络、解码与 GPU 生命周期</h2>
        <p>核心文件包含 fetch、ImageBitmap、Texture、外部复制与渲染；React 文件管理资源 URL、flipY、异步取消与 Canvas resize；共享 runtime 负责设备初始化和编译错误。</p>
        <LessonSourcePanel title="加载图像完整项目源码" description="图像加载核心、交互组件与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>失败信息要区分网络、解码和 GPU 阶段</h2>
        <p>HTTP 错误、ImageBitmap 解码失败、二维纹理尺寸超限、WGSL 编译失败和 Pipeline 创建失败都会进入状态区。异步流程在每个 await 后检查 AbortSignal。</p>
        <p>成功与失败路径都会关闭 ImageBitmap。组件卸载时销毁 GPUTexture、解除 Canvas 配置并销毁 Device。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>网络</strong>能够说明 fetch、Blob 与 ImageBitmap 的职责。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>资源</strong>能够按 bitmap.width 与 height 创建 Texture。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>复制</strong>能够指出 copyExternalImageToTexture 的源、目标和范围。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>清理</strong>能够定位 abort、bitmap.close 和 texture.destroy。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="textures"><ArrowLeft aria-hidden="true" /> 纹理基础</LessonLink>
        <div><h2>接下来</h2><p>静态图像只复制一次。下一章使用 GPUExternalTexture 在每个视频帧到达时导入当前画面。</p></div>
        <LessonLink lessonId="video-textures">高效使用视频 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
