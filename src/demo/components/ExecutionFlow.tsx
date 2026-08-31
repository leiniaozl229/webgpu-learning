import { Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const flowSteps = [
  {
    title: '请求 Adapter 与 Device',
    shortLabel: 'Device',
    actor: 'JavaScript · CPU',
    description: 'JavaScript 先向浏览器请求 GPUAdapter，再从适配器创建后续资源与命令共用的 GPUDevice。',
    code: 'requestAdapter() → requestDevice()',
  },
  {
    title: '创建 Shader Module 与 Pipeline',
    shortLabel: 'Pipeline',
    actor: 'WebGPU API · CPU',
    description: 'WGSL 进入 GPUShaderModule，Render Pipeline 固化入口函数、目标格式和图元拓扑。',
    code: 'createShaderModule() + createRenderPipelineAsync()',
  },
  {
    title: '取得当前 Canvas Texture',
    shortLabel: 'Texture',
    actor: 'JavaScript · CPU',
    description: '每次绘制都从 GPUCanvasContext 获取当前帧纹理，并创建默认 Texture View 作为颜色附件。',
    code: 'getCurrentTexture().createView()',
  },
  {
    title: '编码 Render Pass',
    shortLabel: 'Render Pass',
    actor: 'JavaScript · CPU',
    description: 'Command Encoder 记录 beginRenderPass、setPipeline 与 draw(3)。这些调用只追加命令。',
    code: 'beginRenderPass() → setPipeline() → draw(3)',
  },
  {
    title: '完成 Command Buffer',
    shortLabel: 'Finish',
    actor: 'JavaScript · CPU',
    description: 'Render Pass 结束后，finish() 把已记录的命令封装成不可继续修改的 GPUCommandBuffer。',
    code: 'pass.end() → encoder.finish()',
  },
  {
    title: '提交并执行着色器',
    shortLabel: 'Submit',
    actor: 'GPUQueue · CPU → GPU',
    description: 'queue.submit() 让 GPU 执行顶点着色、光栅化和片段着色，结果最终写入当前 Canvas Texture。',
    code: 'queue.submit([commandBuffer]) → Canvas',
  },
] as const;

const pointStarts = [
  { cx: 104, cy: 108 },
  { cx: 160, cy: 108 },
  { cx: 216, cy: 108 },
];

const pointTargets = [
  { cx: 52, cy: 180 },
  { cx: 160, cy: 36 },
  { cx: 268, cy: 180 },
];

const trianglePoints = pointTargets.map(({ cx, cy }) => `${cx},${cy}`).join(' ');

function getCpuState(activeStep: number) {
  if (activeStep === 0) return 'requestAdapter()';
  if (activeStep === 1) return 'WGSL + Pipeline Descriptor';
  if (activeStep === 2) return '当前 Canvas Texture';
  if (activeStep === 3) return '记录 Render Pass';
  if (activeStep === 4) return '生成 Command Buffer';
  return 'queue.submit(...)';
}

function getGpuState(activeStep: number) {
  if (activeStep === 0) return '等待 Device';
  if (activeStep === 1) return 'Shader Module + Pipeline';
  if (activeStep <= 4) return '等待 Command Buffer';
  return 'Vertex → Rasterizer → Fragment';
}

export function ExecutionFlow() {
  const reducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (reducedMotion) setIsPlaying(false);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeStep === flowSteps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setActiveStep((step) => step + 1), 1650);
    return () => window.clearTimeout(timer);
  }, [activeStep, isPlaying]);

  function selectStep(index: number) {
    setIsPlaying(false);
    setActiveStep(index);
  }

  function togglePlayback() {
    if (reducedMotion) {
      setActiveStep((step) => (step + 1) % flowSteps.length);
      return;
    }
    if (activeStep === flowSteps.length - 1 && !isPlaying) setActiveStep(0);
    setIsPlaying((playing) => !playing);
  }

  function replay() {
    setActiveStep(0);
    setIsPlaying(!reducedMotion);
  }

  const step = flowSteps[activeStep];
  const transition = { duration: reducedMotion ? 0.01 : 0.52, ease: [0.16, 1, 0.3, 1] as const };
  const signalAtGpu = activeStep >= 5;

  return (
    <MotionConfig reducedMotion="user">
      <div className="execution-flow">
        <header className="execution-flow__header">
          <div>
            <strong>JavaScript → Command Buffer → GPUQueue → Canvas</strong>
            <small>一次 WebGPU 绘制 · 记录与执行的六个阶段</small>
          </div>
          <div className="execution-flow__controls">
            <button type="button" onClick={replay} aria-label="重新播放执行流程" title="重新播放">
              <RotateCcw aria-hidden="true" />
            </button>
            <button className="execution-flow__play" type="button" onClick={togglePlayback} aria-label={reducedMotion ? '显示下一步' : isPlaying ? '暂停执行流程' : '播放执行流程'}>
              {isPlaying && !reducedMotion ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              <span>{reducedMotion ? '下一步' : isPlaying ? '暂停' : '播放'}</span>
            </button>
          </div>
        </header>

        <ol className="execution-flow__steps" aria-label="JavaScript 与 GPU 完成一次 WebGPU 绘制的六个阶段">
          {flowSteps.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-current={activeStep === index ? 'step' : undefined} onClick={() => selectStep(index)}>
                <span>{index + 1}</span>
                <strong>{item.shortLabel}</strong>
              </button>
            </li>
          ))}
        </ol>

        <div className="execution-flow__system" role="group" aria-label="CPU 与 GPU 的当前状态">
          <motion.div className="execution-flow__processor" data-active={activeStep <= 4} animate={{ opacity: activeStep <= 4 ? 1 : 0.64 }} transition={transition}>
            <span>CPU</span>
            <strong>JavaScript</strong>
            <AnimatePresence mode="wait" initial={false}>
              <motion.small key={getCpuState(activeStep)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {getCpuState(activeStep)}
              </motion.small>
            </AnimatePresence>
          </motion.div>

          <div className="execution-flow__bridge" aria-hidden="true">
            <span>GPUQueue</span>
            <div><motion.i animate={{ x: signalAtGpu ? 64 : 0 }} transition={transition} /></div>
          </div>

          <motion.div className="execution-flow__processor" data-active={activeStep === 1 || activeStep >= 5} animate={{ opacity: activeStep === 1 || activeStep >= 5 ? 1 : 0.64 }} transition={transition}>
            <span>GPU</span>
            <strong>命令执行</strong>
            <AnimatePresence mode="wait" initial={false}>
              <motion.small key={getGpuState(activeStep)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {getGpuState(activeStep)}
              </motion.small>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="execution-flow__body">
          <div className="execution-flow__visual">
            <div className="execution-flow__visual-labels" aria-hidden="true"><span>命令 / 渲染预览</span><span>裁剪空间 −1 → 1</span></div>
            <svg viewBox="0 0 320 220" role="img" aria-labelledby="flow-visual-title flow-visual-description">
              <title id="flow-visual-title">WebGPU 命令生成蓝色三角形的过程</title>
              <desc id="flow-visual-description">JavaScript 记录命令并提交后，GPU 执行顶点着色、光栅化和片段着色。</desc>
              <defs>
                <pattern id="flow-fragments" width="12" height="12" patternUnits="userSpaceOnUse">
                  <circle cx="6" cy="6" r="2.4" fill="var(--color-accent)" />
                </pattern>
              </defs>
              <g className="execution-flow__axes" aria-hidden="true">
                <line x1="24" y1="108" x2="296" y2="108" />
                <line x1="160" y1="18" x2="160" y2="202" />
              </g>
              <motion.polygon points={trianglePoints} fill="transparent" stroke="var(--color-accent)" strokeWidth="2" animate={{ opacity: activeStep >= 3 ? 1 : 0, pathLength: activeStep >= 3 ? 1 : 0 }} transition={transition} />
              <motion.polygon points={trianglePoints} fill="url(#flow-fragments)" animate={{ opacity: activeStep === 5 ? 1 : 0 }} transition={transition} />
              <motion.polygon points={trianglePoints} fill="var(--color-accent)" animate={{ opacity: activeStep >= 5 ? 0.92 : 0 }} transition={transition} />
              {pointTargets.map((target, index) => {
                const position = activeStep >= 5 ? target : pointStarts[index];
                return (
                  <motion.circle key={`${target.cx}-${target.cy}`} r="7" fill="var(--color-surface-code)" stroke="var(--color-accent-strong)" strokeWidth="4" animate={{ cx: position.cx, cy: position.cy, scale: activeStep === 5 ? 1.15 : 1 }} transition={{ ...transition, delay: reducedMotion ? 0 : index * 0.07 }} />
                );
              })}
            </svg>
          </div>

          <div className="execution-flow__explanation">
            <div className="execution-flow__step-meta"><span>步骤 {activeStep + 1} / {flowSteps.length}</span><small>{step.actor}</small></div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step.title} initial={{ opacity: 0, x: reducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }} transition={{ duration: reducedMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <code>{step.code}</code>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
