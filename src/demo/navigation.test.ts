import { describe, expect, it } from 'vitest';

import { navigationGroups, parseLessonId } from './navigation';

describe('parseLessonId', () => {
  it('selects registered lessons from the query string', () => {
    expect(parseLessonId('?lesson=how-it-works')).toBe('how-it-works');
    expect(parseLessonId('?lesson=wgsl-interstage')).toBe('wgsl-interstage');
    expect(parseLessonId('?lesson=uniforms')).toBe('uniforms');
    expect(parseLessonId('?lesson=storage-buffers')).toBe('storage-buffers');
    expect(parseLessonId('?lesson=vertex-buffers')).toBe('vertex-buffers');
    expect(parseLessonId('?lesson=textures')).toBe('textures');
    expect(parseLessonId('?lesson=image-textures')).toBe('image-textures');
    expect(parseLessonId('?lesson=video-textures')).toBe('video-textures');
    expect(parseLessonId('?lesson=cube-maps')).toBe('cube-maps');
    expect(parseLessonId('?lesson=storage-textures')).toBe('storage-textures');
    expect(parseLessonId('?lesson=msaa')).toBe('msaa');
    expect(parseLessonId('?lesson=compute')).toBe('compute');
  });

  it('falls back to fundamentals for unknown lessons', () => {
    expect(parseLessonId('?lesson=unknown')).toBe('fundamentals');
    expect(parseLessonId('?lesson=fundamentals')).toBe('fundamentals');
    expect(parseLessonId('')).toBe('fundamentals');
  });

  it('keeps the current Fundamentals shader-data order', () => {
    const basics = navigationGroups[0].items.map((item) => item.label);
    expect(basics).toEqual([
      '基础知识',
      '着色器数据传递',
      'Inter-stage 变量',
      'Uniforms',
      '存储缓冲区',
      '顶点缓冲区',
      '纹理',
      '纹理基础',
      '加载图像',
      '高效使用视频',
      '立方体贴图',
      '存储纹理',
      '多重采样 / MSAA',
      '即时变量',
      '常量',
      '着色器杂项输入',
      '数据内存布局',
      '透明度与混合',
      '绑定组布局',
      '数据拷贝',
      '可选特性与限制',
      '计时与性能',
      'WGSL',
      '工作原理',
      '兼容性模式',
    ]);
    expect(navigationGroups.map((group) => group.label)).toEqual([
      '基础概念',
      '3D 数学',
      '光照',
      '技术',
      '计算着色器',
      '杂项',
    ]);
    const textureItems = navigationGroups[0].items.filter((item) => item.depth === 2);
    expect(textureItems).toHaveLength(6);
    expect(textureItems.every((item) => item.id && item.href && !item.badge)).toBe(true);
  });
});
