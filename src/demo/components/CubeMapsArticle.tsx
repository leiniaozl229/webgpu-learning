import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Compass,
  Layers3,
  MonitorUp,
} from 'lucide-react';
import type { ReactNode } from 'react';

import cubeMapCoreSource from '../../core/cubeMaps.ts?raw';
import runtimeSource from '../../core/textureRuntime.ts?raw';
import playgroundSource from './CubeMapPlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { CubeMapPlayground } from './CubeMapPlayground';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';

const cubeTextureCode = `const cubeTexture = device.createTexture({
  label: 'six cube faces',
  size: [faceSize, faceSize, 6],
  dimension: '2d',
  format: 'rgba8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
});

const cubeView = cubeTexture.createView({
  dimension: 'cube',
});`;

const uploadFacesCode = `faceData.forEach((pixels, faceIndex) => {
  device.queue.writeTexture(
    { texture: cubeTexture, origin: { x: 0, y: 0, z: faceIndex } },
    pixels,
    { bytesPerRow: faceSize * 4 },
    { width: faceSize, height: faceSize, depthOrArrayLayers: 1 },
  );
});`;

const directionCode = `@group(0) @binding(1) var cubeTexture: texture_cube<f32>;

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let direction = normalize(vec3f(screenXY, 1.0));
  return textureSample(cubeTexture, cubeSampler, direction);
}`;

const sourceFiles = [
  { id: 'core', label: 'core/cubeMaps.ts', code: cubeMapCoreSource },
  { id: 'playground', label: 'CubeMapPlayground.tsx', code: playgroundSource },
  { id: 'runtime', label: 'core/textureRuntime.ts', code: runtimeSource },
] as const;

export function CubeMapsArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="textures">纹理</LessonLink><span aria-hidden="true">/</span><span>多层纹理</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>立方体贴图</h1>
        <p className="lesson-lead">把六张等尺寸图像存入二维 Texture 的六个 array layer，创建 cube Texture View，再用三维方向向量跨面采样。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>texture_cube</li><li>6 Array Layers</li><li>约 32 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="cube-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Box /></div>
        <div><h2 id="cube-learn-heading">本章输入是六个同尺寸 RGBA 面</h2><ul><li>层顺序固定为 +X、−X、+Y、−Y、+Z、−Z</li><li>每层使用相同宽高、格式和 mip 数量</li><li>GPUTexture 保持二维，Texture View 使用 cube dimension</li><li>Shader 输入从 vec2 UV 扩展为 vec3 方向</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>方向向量同时决定面与面内坐标</h2>
        <ol className="pipeline" aria-label="Cube Map 数据路径">
          <li><span><Layers3 aria-hidden="true" /></span><strong>6 × RGBA layers</strong><small>Queue 分别上传六个 z layer</small></li>
          <li><span><Box aria-hidden="true" /></span><strong>Cube Texture View</strong><small>把二维数组解释成六个立方体面</small></li>
          <li><span><Compass aria-hidden="true" /></span><strong>vec3 direction</strong><small>主轴选面，其余分量形成二维坐标</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Fragment 输出方向采样颜色</small></li>
        </ol>
      </section>

      <section id="cube-layout" className="lesson-section">
        <h2>六个 array layer 组成一个 cube view</h2>
        <div className="cube-face-grid" role="img" aria-label="立方体贴图六个面的展开布局">
          <span data-face="py">+Y</span><span data-face="nx">−X</span><span data-face="pz">+Z</span><span data-face="px">+X</span><span data-face="nz">−Z</span><span data-face="ny">−Y</span>
        </div>
        <p>底层 Texture 的 depthOrArrayLayers 为 6。默认二维 view 只表示数组层；显式创建 <code>dimension: 'cube'</code> 后，WGSL 才能将它绑定到 <code>texture_cube&lt;f32&gt;</code>。</p>
        <CodeBlock label="创建六层 Texture 与 cube view">{cubeTextureCode}</CodeBlock>
        <CodeBlock label="逐层上传六个面">{uploadFacesCode}</CodeBlock>
      </section>

      <section id="direction-sampling" className="lesson-section">
        <h2>采样坐标是方向，无需限制到 0–1</h2>
        <p>方向向量的长度不会改变选取位置，方向符号与最大绝对分量决定命中的面。页面从屏幕坐标构造射线方向，再用 yaw 与 pitch Uniform 旋转。</p>
        <CodeBlock language="wgsl" label="用 vec3 方向采样 cube texture">{directionCode}</CodeBlock>
      </section>

      <section id="cube-lab" className="lesson-section lesson-section--wide">
        <h2>旋转方向观察六个纹理面</h2>
        <p>六个面使用不同基色和边框。拖动 yaw 与 pitch 后，Fragment Shader 只更新 16 字节 Uniform，Cube Texture、View、Sampler 和 Pipeline 都继续复用。</p>
        <CubeMapPlayground />
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现包含六层生成与方向计算</h2>
        <p>核心文件负责面数据、六次上传、cube view、方向 Shader 和 Uniform；React 文件管理角度控件与 Canvas resize；共享 runtime 负责设备与编译诊断。</p>
        <LessonSourcePanel title="立方体贴图完整项目源码" description="Cube Map 核心、交互组件与共享 runtime" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>六个面必须保持结构一致</h2>
        <p>创建前应检查每个面的宽高、格式和 mip 数量。View dimension 与 Shader 类型不匹配时，Pipeline 或 Bind Group 验证会失败并进入状态区。</p>
        <p>组件卸载时销毁 Uniform Buffer 和六层 Texture，随后释放 Canvas Context 与 Device。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>层</strong>能够写出 +X、−X、+Y、−Y、+Z、−Z 的顺序。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>视图</strong>能够区分二维 Texture 与 cube Texture View。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>坐标</strong>能够说明 vec3 方向如何选择纹理面。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>更新</strong>能够指出旋转只写入 16 字节 Uniform。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="video-textures"><ArrowLeft aria-hidden="true" /> 高效使用视频</LessonLink>
        <div><h2>接下来</h2><p>前面的 Texture 都由 CPU 或浏览器外部源提供。下一章让 Compute Shader 直接写入 Storage Texture。</p></div>
        <LessonLink lessonId="storage-textures">存储纹理 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
