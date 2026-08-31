# Product

## Users

主要用户是正在系统学习 WebGPU、WGSL 与 GPU 编程的个人开发者。核心场景是桌面端专注阅读和运行实验，移动端用于复习概念、数据流与代码关系。

## Product Purpose

把分散的 WebGPU API、WGSL 语法、GPU 资源关系和个人理解沉淀为一套可持续扩展的中文学习站。成功意味着学习者能从 TypedArray 出发，沿 GPUBuffer、Binding、Shader、Texture 或 Readback 追踪完整数据路径。

## Brand Personality

清晰、友好、严谨。表达方式参考现代开发者文档：内容密度高且阅读节奏轻松，技术细节准确，交互直接服务于理解。

## Scope

- 原生 WebGPU API 与 WGSL 核心子集
- 真实 GPU 渲染、计算与回读实验
- 资源、命令和阶段接口的可视化解释
- 明暗主题、响应式课程导航和可访问交互

后续内容按数据传递、纹理、3D 数学、光照、后处理、计算案例与性能逐步扩展。

## Anti-references

避免整页密集文字、照搬第三方教程、无法运行的代码片段、缺失清理逻辑的 GPU 示例，以及用黑盒抽象隐藏底层资源与命令关系。

## Design Principles

- 先建立心智模型，再展示 API 调用顺序。
- 每个核心概念提供可观察、可修改的运行结果。
- 每段代码说明来源、usage、binding、提交时机和去向。
- 学习代码保持短小透明，抽象只服务于资源复用和安全清理。
- 章节结构稳定，让新增实验自然进入同一套导航与阅读体验。
- 内容来源可追溯，解释与示例保持原创组织。

## Accessibility & Inclusion

默认满足 WCAG AA 对比度；支持键盘导航、清晰焦点、语义化结构、200% 页面缩放、移动端触控和 `prefers-reduced-motion`。状态信息同时使用图标、文字和颜色表达。
