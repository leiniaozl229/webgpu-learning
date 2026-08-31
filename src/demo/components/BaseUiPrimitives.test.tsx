import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Sidebar } from './Sidebar';
import { WebgpuTrianglePlayground } from './WebgpuTrianglePlayground';

describe('Base UI primitives', () => {
  it('renders the WebGPU source tabs with an accessible tab list', () => {
    const html = renderToStaticMarkup(createElement(WebgpuTrianglePlayground));

    expect(html).toContain('role="tablist"');
    expect(html).toContain('webgpu.ts');
    expect(html).toContain('triangle.wgsl');
  });

  it('renders collapsible course groups expanded by default', () => {
    const html = renderToStaticMarkup(createElement(Sidebar, {
      open: true,
      collapsed: false,
      isDesktop: false,
      lessonId: 'fundamentals',
      onClose: () => undefined,
    }));

    expect(html).toContain('data-panel-open');
    expect(html).toContain('基础知识');
    expect(html).toContain('着色器数据传递');
    expect(html).toContain('aria-current="page"');
  });
});
