# WebGPU Learning 课程大纲

本课程严格采用 [WebGPU Fundamentals 中文教程当前目录](https://webgpufundamentals.org/webgpu/lessons/zh_cn/webgpu-fundamentals.html#toc) 的章节分组和先后顺序。站内示例使用 TypeScript、React、原生 WebGPU API 与 WGSL 重新实现；参考页没有出现的扩展主题不进入主课程大纲。

## 内容原则

- 课程顺序与参考教程的当前 `#toc` 保持一致。
- 每篇都是站内可独立完成的教程；参考链接负责来源追溯，不承担缺失的概念或步骤。
- 课程必须给出完整输入、资源关系、执行命令、可观察输出、错误处理和清理路径。
- 已完成课程用 `[x]` 标记，后续课程保留原目录位置。
- 每篇先说明数据来源、资源 usage、binding 和命令时机，再展示完整代码。
- 浏览器兼容性与 API 细节按照当前 WebGPU / WGSL 规范校正。
- 每个 GPU 实验提供错误信息、资源清理和 Canvas 尺寸处理。

## 1. 基础概念

- [x] 基础知识

### 着色器数据传递

- [x] Inter-stage 变量
- [x] Uniforms
- [x] 存储缓冲区（Storage Buffer）
- [x] 顶点缓冲区（Vertex Buffers）

#### 纹理

- [ ] 纹理
- [ ] 加载图像
- [ ] 高效使用视频
- [ ] 立方体贴图
- [ ] 存储纹理
- [ ] 多重采样 / MSAA

#### 其他 Shader 输入

- [ ] 即时变量
- [ ] 常量
- [ ] 着色器杂项输入

### 基础专题

- [ ] 数据内存布局
- [ ] 透明度与混合
- [ ] 绑定组布局
- [ ] 数据拷贝
- [ ] 可选特性与限制
- [ ] 计时与性能
- [ ] WGSL
- [x] 工作原理
- [ ] 兼容性模式

## 2. 3D 数学

- [ ] 平移（Translation）
- [ ] 旋转（Rotation）
- [ ] 缩放（Scale）
- [ ] 矩阵数学（Matrix Math）
- [ ] 正交投影（Orthographic Projection）
- [ ] 透视投影（Perspective Projection）
- [ ] 相机（Cameras）
- [ ] 矩阵栈（Matrix Stacks）
- [ ] 场景图（Scene Graphs）

## 3. 光照

- [ ] 方向光（Directional Lighting）
- [ ] 点光源（Point Lighting）
- [ ] 聚光灯（Spot Lighting）

## 4. 技术

### 2D

- [ ] Large Clip Space Triangle

### 3D

- [ ] 环境映射（Environment Maps）
- [ ] 天空盒（Skyboxes）

### 后处理

- [ ] 基础 CRT 效果
- [ ] 图像调整
- [ ] 一维查找表（1D-LUT）
- [ ] 三维查找表（3D-LUT）

### 编辑器

- [ ] 高亮显示
- [ ] 相机控制
- [ ] 拾取

## 5. 计算着色器

- [x] 计算着色器基础
- [ ] 图像直方图
- [ ] 图像直方图进阶

## 6. 杂项

- [ ] 调整 Canvas 尺寸
- [ ] 多画布
- [ ] 点
- [ ] WebGL 到 WebGPU
- [ ] 速度与优化
- [ ] 调试与错误
- [ ] 资源 / 参考
- [ ] WGSL Function Reference
- [ ] WGSL Offset Computer

## 官方扩展参考

- [WebGPU Fundamentals GitHub](https://github.com/gfxfundamentals/webgpufundamentals)
- [Tour of WGSL](https://google.github.io/tour-of-wgsl/)
- [WebGPU API Reference](https://gpuweb.github.io/types/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WGSL Specification](https://www.w3.org/TR/WGSL/)
- [WebGPUReport.org](https://webgpureport.org/)
- [Web3DSurvey.com](https://web3dsurvey.com/)
