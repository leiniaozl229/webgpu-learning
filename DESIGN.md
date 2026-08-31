---
name: WebGPU Learning
description: 一册可运行、可修改、持续生长的中文 WebGPU 实验讲义
colors:
  page: "oklch(0.985 0.006 230)"
  surface: "oklch(1 0 0)"
  surface-soft: "oklch(0.965 0.012 230)"
  ink: "oklch(0.255 0.025 245)"
  ink-soft: "oklch(0.47 0.025 245)"
  border: "oklch(0.88 0.014 230)"
  lab-blue: "oklch(0.69 0.145 238)"
  lab-blue-strong: "oklch(0.52 0.17 244)"
  lab-blue-soft: "oklch(0.95 0.035 238)"
  success: "oklch(0.6 0.14 158)"
  error: "oklch(0.58 0.19 28)"
---

# Design System: WebGPU Learning

## Creative North Star

“The Living GPU Lab Manual”——阅读区像编校清楚的技术书，互动区像可随手修改的 GPU 实验台。页面依靠稳定导航、宽松留白、清楚层级和真实 WebGPU 输出组织信息，让抽象资源关系保持精确且亲和。

## Visual Language

- 冷白纸面、深蓝灰文字和少量实验室蓝构成浅色主题。
- 深色主题使用安静的 Code Night 表面，保持相同的信息层级。
- 蓝色在单个视窗中控制在约 10%，只标记方向、状态和可操作位置。
- 常驻卡片依靠 1px 边框和背景明度分层；阴影只用于移动抽屉等覆盖层。
- 页面不使用渐变背景。

## Typography and Rhythm

- 展示标题：每页一个，`clamp(2.5rem, 9vw, 4.6rem)`，紧凑行高。
- 章节标题：清晰区分新概念，正文保持约 72ch 行长。
- 正文：Atkinson Hyperlegible Next 与系统中文字体回退，行高 1.7。
- 代码：SFMono-Regular、Consolas 与 Liberation Mono 回退。
- 间距以 8px 为基准，触控目标最小 44px，圆角控制在 8–16px。

## Navigation

课程使用查询参数和 History API 保留可复制 URL、浏览器前进与后退。桌面侧栏固定显示并可收起；窄屏使用带遮罩的抽屉，支持关闭按钮与 Escape。切换课程后焦点移动到新标题。

## Code and Lab Surfaces

- TypeScript 与 WGSL 使用同一套 Prism 语义色。
- 编辑器、状态区、Canvas 和运行操作组合为一个闭环。
- WGSL 编译错误保留行号、列号和完整消息。
- 宽屏实验主体可扩展到 64rem；窄屏代码与 Canvas 顺序堆叠。
- Canvas 使用真实 WebGPU 输出，响应 ResizeObserver、DPR 和 `maxTextureDimension2D`。

## Interactive Components

- Command Flow：六阶段展示 Device、Pipeline、Texture、Render Pass、Command Buffer 与 Queue 提交，支持播放、暂停、重播和阶段直达。
- WGSL Playground：可编辑 Shader Module，重新创建 Pipeline，并显示编译诊断。
- Uniform Lab：实时更新 32 字节 Uniform Buffer，观察位置、缩放和颜色变化。
- Vertex Buffer Inspector：按顶点查看 20 字节交错记录、字段 offset 与真实 Canvas 结果。
- Compute Lab：展示 Storage、dispatch、copy、map 与 CPU 副本的完整回读路径。

## Motion and Accessibility

- Motion 只负责帮助理解阶段变化，文字说明始终可直接访问。
- `prefers-reduced-motion` 下取消自动播放和长过渡。
- 所有 Tabs、按钮、输入与导航提供清晰 hover、selected 和 focus-visible 状态。
- 成功与错误信息通过 `aria-live` 宣告，状态含可读文字。

## Do

- 先解释数据与对象的关系，再展示命令顺序。
- 为 Adapter、Device、资源、Pipeline、Pass、Command Buffer 和 Queue 标明职责。
- 明确 Buffer usage、字节布局、binding 和资源生命周期。
- 让每个实验都能运行、失败、重试和安全清理。

## Avoid

- 用大面积装饰抢占阅读注意力。
- 省略异步失败、设备丢失和 GPU 资源释放。
- 提供脱离数据来源与最终去向的孤立代码。
- 用重型抽象遮蔽原生 WebGPU API。
