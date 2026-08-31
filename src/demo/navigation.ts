export type LessonId =
  | 'fundamentals'
  | 'wgsl-interstage'
  | 'uniforms'
  | 'storage-buffers'
  | 'vertex-buffers'
  | 'how-it-works'
  | 'compute';

export interface NavigationItem {
  id?: LessonId;
  label: string;
  href?: string;
  badge?: string;
  depth?: 1 | 2;
  kind?: 'section';
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export interface TableOfContentsItem {
  label: string;
  href: string;
}

const planned = (label: string, depth?: 1 | 2): NavigationItem => ({
  label,
  badge: '规划中',
  depth,
});

const section = (label: string, depth?: 1 | 2): NavigationItem => ({
  label,
  depth,
  kind: 'section',
});

export const navigationGroups: NavigationGroup[] = [
  {
    label: '基础概念',
    items: [
      { id: 'fundamentals', label: '基础知识', href: '/?lesson=fundamentals#lesson-title' },
      section('着色器数据传递'),
      { id: 'wgsl-interstage', label: 'Inter-stage 变量', href: '/?lesson=wgsl-interstage#lesson-title', depth: 1 },
      { id: 'uniforms', label: 'Uniforms', href: '/?lesson=uniforms#lesson-title', depth: 1 },
      { id: 'storage-buffers', label: '存储缓冲区', href: '/?lesson=storage-buffers#lesson-title', depth: 1 },
      { id: 'vertex-buffers', label: '顶点缓冲区', href: '/?lesson=vertex-buffers#lesson-title', depth: 1 },
      section('纹理', 1),
      planned('纹理基础', 2),
      planned('加载图像', 2),
      planned('高效使用视频', 2),
      planned('立方体贴图', 2),
      planned('存储纹理', 2),
      planned('多重采样 / MSAA', 2),
      planned('即时变量', 1),
      planned('常量', 1),
      planned('着色器杂项输入', 1),
      planned('数据内存布局'),
      planned('透明度与混合'),
      planned('绑定组布局'),
      planned('数据拷贝'),
      planned('可选特性与限制'),
      planned('计时与性能'),
      planned('WGSL'),
      { id: 'how-it-works', label: '工作原理', href: '/?lesson=how-it-works#lesson-title' },
      planned('兼容性模式'),
    ],
  },
  {
    label: '3D 数学',
    items: [
      planned('平移（Translation）'),
      planned('旋转（Rotation）'),
      planned('缩放（Scale）'),
      planned('矩阵数学'),
      planned('正交投影'),
      planned('透视投影'),
      planned('相机'),
      planned('矩阵栈'),
      planned('场景图'),
    ],
  },
  {
    label: '光照',
    items: [
      planned('方向光'),
      planned('点光源'),
      planned('聚光灯'),
    ],
  },
  {
    label: '技术',
    items: [
      section('2D'),
      planned('Large Clip Space Triangle', 1),
      section('3D'),
      planned('环境映射', 1),
      planned('天空盒', 1),
      section('后处理'),
      planned('基础 CRT 效果', 1),
      planned('图像调整', 1),
      planned('一维查找表（1D-LUT）', 1),
      planned('三维查找表（3D-LUT）', 1),
      section('编辑器'),
      planned('高亮显示', 1),
      planned('相机控制', 1),
      planned('拾取', 1),
    ],
  },
  {
    label: '计算着色器',
    items: [
      { id: 'compute', label: '计算着色器基础', href: '/?lesson=compute#lesson-title' },
      planned('图像直方图'),
      planned('图像直方图进阶'),
    ],
  },
  {
    label: '杂项',
    items: [
      planned('调整 Canvas 尺寸'),
      planned('多画布'),
      planned('点'),
      planned('WebGL 到 WebGPU'),
      planned('速度与优化'),
      planned('调试与错误'),
      planned('资源 / 参考'),
      planned('WGSL Function Reference'),
      planned('WGSL Offset Computer'),
    ],
  },
];

export const tableOfContentsByLesson: Record<LessonId, TableOfContentsItem[]> = {
  fundamentals: [
    { label: '本章的独立学习约定', href: '#chapter-contract' },
    { label: '建立可运行项目', href: '#project-setup' },
    { label: 'WebGPU 的两项能力', href: '#what-webgpu-does' },
    { label: '起步：三类 Shader', href: '#getting-started' },
    { label: '绘制三角形到纹理', href: '#render-pipeline' },
    { label: '第一个三角形', href: '#hello-triangle' },
    { label: '编码并提交命令', href: '#command-flow' },
    { label: '在 GPU 上进行计算', href: '#basic-compute' },
    { label: '简要调整 Canvas 尺寸', href: '#canvas-resize' },
    { label: '完整可运行源码', href: '#complete-source' },
    { label: '错误处理与资源清理', href: '#errors-cleanup' },
    { label: '本章检查', href: '#chapter-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'wgsl-interstage': [
    { label: '本章学习路径', href: '#lesson-path' },
    { label: 'WGSL 入口函数', href: '#entry-points' },
    { label: '阶段接口', href: '#stage-interface' },
    { label: '插值规则', href: '#interpolation' },
    { label: '颜色插值实验', href: '#interpolation-lab' },
    { label: '每帧数据与命令', href: '#frame-flow' },
    { label: '完整项目源码', href: '#complete-source' },
    { label: '诊断与清理', href: '#diagnostics-cleanup' },
    { label: '本章检查', href: '#chapter-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  uniforms: [
    { label: '本章输入约定', href: '#input-contract' },
    { label: 'Uniform 数据路径', href: '#data-path' },
    { label: '绑定模型', href: '#binding-model' },
    { label: '内存布局', href: '#memory-layout' },
    { label: 'Uniform 实验', href: '#uniform-lab' },
    { label: '更新路径', href: '#update-path' },
    { label: '完整项目源码', href: '#complete-source' },
    { label: '诊断与清理', href: '#diagnostics-cleanup' },
    { label: '本章检查', href: '#chapter-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'storage-buffers': [
    { label: '本章输入约定', href: '#input-contract' },
    { label: 'Storage 数据路径', href: '#data-path' },
    { label: '从 Uniform 改为 Storage', href: '#uniform-to-storage' },
    { label: '两类 Buffer 的差异', href: '#buffer-differences' },
    { label: '多实例绘制', href: '#instanced-drawing' },
    { label: 'Storage Buffer 实验', href: '#storage-lab' },
    { label: '存储顶点数据', href: '#vertex-pulling' },
    { label: '完整项目源码', href: '#complete-source' },
    { label: '诊断与清理', href: '#diagnostics-cleanup' },
    { label: '本章检查', href: '#chapter-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'vertex-buffers': [
    { label: '本章输入约定', href: '#input-contract' },
    { label: 'Vertex 数据路径', href: '#data-path' },
    { label: '交错数据', href: '#interleaved-data' },
    { label: 'Vertex Layout', href: '#vertex-layout' },
    { label: 'Buffer 检视器', href: '#vertex-buffer-lab' },
    { label: 'Shader 输入', href: '#shader-inputs' },
    { label: '命令与 slot', href: '#command-flow' },
    { label: '选择数据路径', href: '#buffer-choice' },
    { label: '完整项目源码', href: '#complete-source' },
    { label: '诊断与清理', href: '#diagnostics-cleanup' },
    { label: '本章检查', href: '#chapter-checklist' },
    { label: '继续学习', href: '#next-steps' },
  ],
  'how-it-works': [
    { label: 'Shader 调用模型', href: '#shader-call-model' },
    { label: '六类数据来源', href: '#shader-data-sources' },
    { label: '顶点阶段', href: '#vertex-processing' },
    { label: '光栅化与插值', href: '#rasterization' },
    { label: '片段阶段与纹理', href: '#fragment-processing' },
    { label: '课程位置', href: '#course-position' },
  ],
  compute: [
    { label: '计算模型', href: '#compute-model' },
    { label: 'Storage Buffer', href: '#storage-buffer' },
    { label: 'Compute 实验', href: '#compute-lab' },
    { label: '映射与回读', href: '#readback' },
    { label: '后续路线', href: '#next-steps' },
  ],
};

export const sourceByLesson: Record<LessonId, string> = {
  fundamentals: 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-fundamentals.html',
  'wgsl-interstage': 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-inter-stage-variables.html',
  uniforms: 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-uniforms.html',
  'storage-buffers': 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-storage-buffers.html',
  'vertex-buffers': 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-vertex-buffers.html',
  'how-it-works': 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-how-it-works.html',
  compute: 'https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-compute-shaders.html',
};

export function parseLessonId(search: string): LessonId {
  const lesson = new URLSearchParams(search).get('lesson');
  if (
    lesson === 'wgsl-interstage'
    || lesson === 'uniforms'
    || lesson === 'storage-buffers'
    || lesson === 'vertex-buffers'
    || lesson === 'how-it-works'
    || lesson === 'compute'
  ) return lesson;
  return 'fundamentals';
}

export function readLessonId(): LessonId {
  if (typeof window === 'undefined') return 'fundamentals';
  return parseLessonId(window.location.search);
}
