import {
  ArrowLeft,
  ArrowRight,
  Braces,
  CheckCircle2,
  Database,
  GitBranch,
  MonitorUp,
  Rows3,
  Send,
} from 'lucide-react';
import type { ReactNode } from 'react';

import vertexCoreSource from '../../core/vertexBuffers.ts?raw';
import {
  VERTEX_BUFFER_SETUP_SOURCE,
  VERTEX_BUFFER_WGSL,
} from '../../core/vertexBuffers';
import webgpuHelpersSource from '../../core/webgpu.ts?raw';
import playgroundSource from './VertexBufferPlayground.tsx?raw';
import { CodeBlock } from './CodeBlock';
import { LessonLink } from './LessonLink';
import { LessonSourcePanel } from './LessonSourcePanel';
import { VertexBufferPlayground } from './VertexBufferPlayground';

const interleavedValuesCode = `const vertices = new Float32Array([
  // position.xy  color.rgb
   0.00,  0.62,  0.98, 0.34, 0.28,
  -0.58, -0.52,  0.18, 0.72, 0.52,
   0.58, -0.52,  0.20, 0.50, 0.98,
]);

// 3 条记录 × 5 个 f32 × 4 字节 = 60 字节。`;

const pipelineLayoutCode = `const pipeline = await device.createRenderPipelineAsync({
  layout: 'auto',
  vertex: {
    module,
    entryPoint: 'vertexMain',
    buffers: [{
      arrayStride: 20,
      stepMode: 'vertex',
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x2' },
        { shaderLocation: 1, offset: 8, format: 'float32x3' },
      ],
    }],
  },
  fragment: {
    module,
    entryPoint: 'fragmentMain',
    targets: [{ format }],
  },
});`;

const renderCode = `const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    clearValue,
    loadOp: 'clear',
    storeOp: 'store',
  }],
});

pass.setPipeline(pipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.draw(3);
pass.end();

device.queue.submit([encoder.finish()]);`;

const sourceFiles = [
  { id: 'core', label: 'core/vertexBuffers.ts', code: vertexCoreSource },
  { id: 'playground', label: 'VertexBufferPlayground.tsx', code: playgroundSource },
  { id: 'helpers', label: 'core/webgpu.ts', code: webgpuHelpersSource },
] as const;

export function VertexBuffersArticle({ toc }: { toc?: ReactNode }) {
  return (
    <article className="lesson-article">
      <header className="lesson-hero">
        <nav className="breadcrumb" aria-label="面包屑"><LessonLink lessonId="fundamentals">学习 WebGPU</LessonLink><span aria-hidden="true">/</span><span>着色器数据传递</span></nav>
        <h1 id="lesson-title" tabIndex={-1}>顶点缓冲区</h1>
        <p className="lesson-lead">把位置和颜色交错存进 Float32Array，用 Vertex Buffer Layout 描述每条记录，再由固定功能 Vertex Fetch 为每次 Vertex Shader 调用提供字段。</p>
        <ul className="lesson-meta" aria-label="课程信息"><li>GPUBuffer</li><li>Vertex Layout</li><li>约 34 分钟</li></ul>
      </header>

      {toc}

      <section id="input-contract" className="learning-note" aria-labelledby="vertex-learn-heading">
        <div className="learning-note__icon" aria-hidden="true"><Rows3 /></div>
        <div><h2 id="vertex-learn-heading">本章输入是三条交错记录</h2><ul><li>每条记录包含 position.xy 与 color.rgb，共 20 字节</li><li><code>VERTEX | COPY_DST</code> 允许 Pipeline 读取与 Queue 上传</li><li>Pipeline slot 0 保存一份字节布局，Render Pass 绑定具体 Buffer</li><li>Vertex Shader 通过 location 0 和 1 接收已经解析的字段</li></ul></div>
      </section>

      <section id="data-path" className="lesson-section">
        <h2>固定功能 Vertex Fetch 位于 Buffer 与 Shader 之间</h2>
        <ol className="pipeline" aria-label="Vertex Buffer 数据路径">
          <li><span><Database aria-hidden="true" /></span><strong>Float32Array</strong><small>3 条交错记录，共 60 字节</small></li>
          <li><span><Rows3 aria-hidden="true" /></span><strong>Vertex Buffer slot 0</strong><small>queue.writeBuffer 上传 CPU 数据</small></li>
          <li><span><GitBranch aria-hidden="true" /></span><strong>Vertex Fetch</strong><small>按 stride、offset、format 拆出字段</small></li>
          <li><span><MonitorUp aria-hidden="true" /></span><strong>Canvas Texture</strong><small>Vertex 与 Fragment Shader 生成最终像素</small></li>
        </ol>
      </section>

      <section id="interleaved-data" className="lesson-section">
        <h2>每个顶点是一条 20 字节记录</h2>
        <p>位置使用两个 f32，占记录的前 8 字节；颜色使用三个 f32，占后 12 字节。三条记录连续排列，下一条记录的起点等于当前起点加 <code>arrayStride</code>。</p>
        <CodeBlock label="三条交错顶点记录">{interleavedValuesCode}</CodeBlock>
        <div className="vertex-record-summary"><span><Database aria-hidden="true" /><strong>Float32Array</strong><small>3 × 5 个值 = 60 字节</small></span><span><Rows3 aria-hidden="true" /><strong>arrayStride</strong><small>5 × 4 = 20 字节</small></span></div>
      </section>

      <section id="vertex-layout" className="lesson-section">
        <h2>stride 找记录，offset 与 format 切字段</h2>
        <p><code>arrayStride: 20</code> 让 Vertex Fetch 每次前进 20 字节。location 0 从 offset 0 读取 <code>float32x2</code>，location 1 从 offset 8 读取 <code>float32x3</code>。<code>stepMode: 'vertex'</code> 表示每处理一个顶点就前进一条记录。</p>
        <CodeBlock label="上传 Vertex Buffer">{VERTEX_BUFFER_SETUP_SOURCE}</CodeBlock>
        <CodeBlock label="把 Vertex Layout 放进 Pipeline">{pipelineLayoutCode}</CodeBlock>
      </section>

      <section id="vertex-buffer-lab" className="lesson-section lesson-section--wide">
        <h2>逐条检查 GPU 将要读取的数据</h2>
        <p>选择任意顶点，检视器会展示它在 60 字节 Buffer 中的范围、position 字段和 color 字段。右侧 Canvas 使用同一份 TypedArray 与布局进行真实 WebGPU 绘制。</p>
        <VertexBufferPlayground />
      </section>

      <section id="shader-inputs" className="lesson-section">
        <h2>WGSL 只看到 location 输入</h2>
        <p>Vertex Shader 无需知道 Buffer 总大小、TypedArray 类型和记录数量。固定功能已经按照 Pipeline 布局完成解码，入口函数只接收 location 0 的 <code>vec2f</code> 与 location 1 的 <code>vec3f</code>；颜色随后沿用第一章的 Inter-stage 路径。</p>
        <CodeBlock language="wgsl" label="Vertex Buffer 对应的 WGSL 输入">{VERTEX_BUFFER_WGSL}</CodeBlock>
      </section>

      <section id="command-flow" className="lesson-section">
        <h2>Pipeline 布局与 Pass slot 必须对上</h2>
        <div className="binding-grid">
          <article><Braces aria-hidden="true" /><h3>Pipeline slot 0</h3><code>vertex.buffers[0]</code><p>保存 stride、stepMode 与 attributes。</p></article>
          <article><Database aria-hidden="true" /><h3>Pass slot 0</h3><code>setVertexBuffer(0)</code><p>把具体 GPUBuffer 放到同一个 slot。</p></article>
          <article><Send aria-hidden="true" /><h3>Draw + submit</h3><code>draw(3)</code><p>读取三条记录，结束编码并提交 Queue。</p></article>
        </div>
        <p>每帧先通过 <code>getCurrentTexture()</code> 取得新的颜色附件，再设置 Pipeline 与 Vertex Buffer。Buffer 数据未变化时无需重复上传。</p>
        <CodeBlock label="绑定 slot 0 并提交绘制">{renderCode}</CodeBlock>
      </section>

      <section id="buffer-choice" className="lesson-section">
        <h2>根据访问方式选择 Vertex 或 Storage</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead><tr><th scope="col">路径</th><th scope="col">Vertex Buffer</th><th scope="col">Storage vertex pulling</th></tr></thead>
            <tbody>
              <tr><th scope="row">读取者</th><td>固定功能 Vertex Fetch</td><td>Vertex Shader 代码</td></tr>
              <tr><th scope="row">描述方式</th><td>stride、offset、format</td><td>WGSL 数组与索引表达式</td></tr>
              <tr><th scope="row">访问特点</th><td>规律的逐顶点或逐实例记录</td><td>随机读取、自定义解码或共享大数组</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="complete-source" className="lesson-section lesson-section--wide">
        <h2>完整实现连接 CPU 数据与真实绘制</h2>
        <p>核心文件包含 TypedArray、字节常量、记录检视 helper、GPUBuffer、Pipeline Layout、命令提交与清理。React 文件把字节视图和 Canvas 结果并列呈现，共享 helper 负责 Canvas 尺寸与编译诊断。</p>
        <LessonSourcePanel title="顶点缓冲区完整项目源码" description="Vertex Fetch 核心、记录检视器与共享 helper" files={sourceFiles} />
      </section>

      <section id="diagnostics-cleanup" className="lesson-section">
        <h2>布局错误与生命周期都需要显式处理</h2>
        <p>Shader location、attribute format 或 stride 不匹配时，Pipeline 创建会失败；Shader Module 的 compilation info 与异步 Pipeline 错误会进入页面状态区。记录检视 helper 也会拒绝 0–2 以外的顶点索引。</p>
        <p>组件卸载时停止 ResizeObserver，销毁 Vertex Buffer，解除 Canvas 配置并销毁 Device。Canvas 重新调整尺寸后复用原有 Buffer 与 Pipeline，只记录一组新的绘制命令。</p>
      </section>

      <section id="chapter-checklist" className="lesson-section">
        <h2>本章检查</h2>
        <ol className="chapter-checklist">
          <li><CheckCircle2 aria-hidden="true" /><span><strong>记录</strong>能够算出单条 20 字节与总计 60 字节。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>布局</strong>能够解释 arrayStride、offset、format 和 stepMode。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>接口</strong>能够把 shaderLocation 0、1 对接到 WGSL location 0、1。</span></li>
          <li><CheckCircle2 aria-hidden="true" /><span><strong>提交</strong>能够说明 setVertexBuffer、draw、finish 与 submit 的顺序。</span></li>
        </ol>
      </section>

      <section id="next-steps" className="next-steps lesson-pagination">
        <LessonLink lessonId="storage-buffers"><ArrowLeft aria-hidden="true" /> 存储缓冲区</LessonLink>
        <div><h2>接下来</h2><p>Vertex Buffer 已把 UV 送进 Shader。下一章创建第一张 GPUTexture，并用 Sampler 读取二维 texel。</p></div>
        <LessonLink lessonId="textures">纹理基础 <ArrowRight aria-hidden="true" /></LessonLink>
      </section>
    </article>
  );
}
