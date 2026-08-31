# WebGPU Learning

一套可运行、可修改、无需跳转外部资料才能完成学习闭环的中文 WebGPU 教程。项目沿用 `webgl-learning` 的 React 文档式界面与实验台结构，课程分组和顺序严格跟随 [WebGPU Fundamentals 当前目录](https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-fundamentals.html#toc)，并使用 TypeScript、原生 WebGPU API 与 WGSL 实现。

当前包含七篇课程：

- 基础知识：Render、Compute、命令提交与 Canvas resize
- Inter-stage 变量：入口函数、location 接口与颜色插值
- Uniforms：32 字节数据布局和实时参数实验
- 存储缓冲区：运行时数组、instance_index 与多实例绘制
- 顶点缓冲区：arrayStride、offset、format 与交错数据检视器
- 工作原理：六类 Shader 数据来源与光栅化流程
- 计算着色器基础：Storage Buffer、workgroup、Readback Buffer 与映射

所有 GPU 实验都提供错误状态、异步卸载保护、资源清理与 Canvas 尺寸同步。页面同时支持明暗主题、桌面侧栏、移动抽屉、键盘焦点和 `prefers-reduced-motion`。

## 开始

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5194
```

打开 <http://127.0.0.1:5194/>。WebGPU 需要安全上下文；本地开发地址可作为可信来源。实验还需要支持 WebGPU 的浏览器、可用图形适配器和硬件加速环境。

## 质量命令

```bash
npm run check:types
npm test
npm run build
```

## 目录

```text
src/core/       WebGPU 资源、WGSL、命令编码与纯逻辑
src/demo/       React 页面、课程文章和交互实验
docs/           课程规划与学习说明
public/         静态资源
```

新增课程时，先在 `src/demo/navigation.ts` 注册 ID、目录和参考链接，再添加 Article 与对应 core session。GPU session 应提供明确的异步错误反馈和 `dispose()` 清理逻辑。

## 内容来源

课程路线以 [WebGPU Fundamentals 当前 `#toc`](https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-fundamentals.html#toc) 为准。站内中文解释、TypeScript 示例、交互结构与验证代码均在本项目中重新编写，并结合当前 WebGPU/WGSL 规范校正。
