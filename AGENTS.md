# WebGPU Learning 项目协作说明

## 项目目标

这是一个面向个人学习的中文 WebGPU 教程站点。课程参考 WebGPU Fundamentals 的知识路线，使用 React、TypeScript、原生 WebGPU API 与 WGSL 重新组织，并通过命令流动画、资源关系图和可交互实验解释 JavaScript、WebGPU、WGSL 与 GPU 之间的数据关系。

参考教程：[WebGPU Fundamentals 简体中文](https://webgpufundamentals.org/webgpu/lessons/zh_cn/)。

完整课程规划见 `docs/curriculum-outline.md`。

## 技术栈

- React 19
- Base UI
- TypeScript
- Vite
- 原生 WebGPU API
- WGSL
- Motion
- Prism React Renderer
- Vitest

## 常用命令

```bash
npm run dev -- --host 127.0.0.1 --port 5194
npm test
npm run check:types
npm run build
```

完成代码修改后至少运行：

```bash
npm test
npm run check:types
npm run build
git diff --check
```

如果目录尚未初始化为 Git 仓库，使用 `diff --check` 的等效检查，并在交付说明中注明。

## 目录约定

- `src/demo/`：教程站点的 React 页面和交互组件。
- `src/core/`：WebGPU 资源创建、命令编码、WGSL 源码和可独立测试的核心逻辑。
- `docs/`：课程规划、技术说明和学习笔记。
- `DESIGN.md`：视觉语言与设计约束。

## 内容编写规范

- 本项目是一套独立教程。读者无需打开参考教程，也能从站内内容获得完整定义、依赖知识、执行流程、可运行代码、结果解释和故障处理。
- 外部教程只用于校准知识路线、术语和时效性；正文不得用“参考原文已经说明”代替站内讲解。
- 每篇课程必须形成可验证的学习闭环：说明输入从哪里来、资源如何创建和绑定、命令何时提交、GPU 输出到哪里、页面如何观察结果，以及资源如何清理。
- 完整源码应能够连续阅读和复制运行。代码片段需要明确它在完整程序中的位置，避免省略关键变量、初始化、错误处理或清理步骤。
- 使用简体中文解释概念，WebGPU API、WGSL 变量和类型保留英文名称。
- 首次出现术语时解释它在当前命令或渲染流程中的职责。
- 每段代码说明数据来源、资源 usage、绑定位置、提交时机和最终去向。
- 每篇课程保持单一主线，新概念按依赖顺序出现。
- JavaScript 示例优先使用 TypeScript 和 TypedArray。
- 代码注释说明原因和数据关系，避免逐字翻译 API 名称。
- 避免对立式双重否定句式。
- 引用外部教程时保留来源链接，并结合当前规范和浏览器支持情况校正内容。

## 交互与视觉规范

- 延续 React 文档风格的清晰层级和宽松阅读节奏。
- 主色使用偏蓝的实验室色彩，兼顾明暗主题。
- 不使用渐变背景。
- 桌面端和移动端侧边导航都要支持展开与收起。
- 代码区域设置合理的最大高度，并提供滚动。
- Tab、按钮、输入框必须有清晰的悬停、选中和键盘焦点状态。
- 动画兼容 `prefers-reduced-motion`。
- Canvas 处理设备像素比、容器尺寸变化和 `maxTextureDimension2D` 限制。
- Tabs、Collapsible、Dialog、Tooltip 等复合交互优先使用 Base UI primitives，并通过项目 CSS 定义视觉层。

## WebGPU 实现约定

- 检查 `navigator.gpu`、`requestAdapter()`、`requestDevice()` 与 `canvas.getContext('webgpu')` 的返回结果。
- WGSL 编译失败时展示 `getCompilationInfo()` 返回的完整错误信息。
- 为 Adapter、Device、Buffer、Texture、Bind Group、Pipeline、Encoder 和 Pass 说明各自职责。
- GPU 资源使用明确的 `label` 与最小必要 `usage`。
- 映射 Buffer 后及时复制结果并调用 `unmap()`。
- 创建资源后提供清理逻辑，并处理 `device.lost`。
- 每帧通过 `getCurrentTexture()` 获取当前画布纹理。
- 调整 Canvas 尺寸时限制到 `device.limits.maxTextureDimension2D`，随后重新绘制。
- 命令编码与命令提交分开讲解，明确 `finish()` 和 `queue.submit()` 的执行边界。
- 异步初始化避免在组件卸载后更新状态或遗留设备。

## Git 约定

- 保留用户已有的未提交修改。
- 一个提交聚焦一个完整变化。
- 提交前检查工作区差异和验证结果。
- 禁止使用破坏性 Git 命令清除工作区。
