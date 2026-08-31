import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ComputeArticle } from './components/ComputeArticle';
import { HowWebgpuWorksArticle } from './components/HowWebgpuWorksArticle';
import { StorageBuffersArticle } from './components/StorageBuffersArticle';
import { UniformsArticle } from './components/UniformsArticle';
import { VertexBuffersArticle } from './components/VertexBuffersArticle';
import { WebgpuFundamentalsArticle } from './components/WebgpuFundamentalsArticle';
import { WgslInterstageArticle } from './components/WgslInterstageArticle';
import { type LessonId, tableOfContentsByLesson } from './navigation';

const articles: Record<LessonId, ReactNode> = {
  fundamentals: <WebgpuFundamentalsArticle />,
  'wgsl-interstage': <WgslInterstageArticle />,
  uniforms: <UniformsArticle />,
  'storage-buffers': <StorageBuffersArticle />,
  'vertex-buffers': <VertexBuffersArticle />,
  'how-it-works': <HowWebgpuWorksArticle />,
  compute: <ComputeArticle />,
};

describe('lesson table of contents', () => {
  for (const lessonId of Object.keys(articles) as LessonId[]) {
    it(`${lessonId} keeps every TOC link attached to a section`, () => {
      const html = renderToStaticMarkup(articles[lessonId]);
      for (const item of tableOfContentsByLesson[lessonId]) {
        expect(html).toContain(`id="${item.href.slice(1)}"`);
      }
    });
  }
});

describe('shader data transfer lessons', () => {
  it('keeps Inter-stage interpolation, frame submission and cleanup visible', () => {
    const html = renderToStaticMarkup(<WgslInterstageArticle />);

    expect(html).toContain('@interpolate');
    expect(html).toContain('queue.submit');
    expect(html).toContain('core/webgpu.ts');
    expect(html).toContain('context.unconfigure');
  });

  it('keeps Uniform packing, binding and update timing visible', () => {
    const html = renderToStaticMarkup(<UniformsArticle />);

    expect(html).toContain('32 字节');
    expect(html).toContain('group 0 · binding 0');
    expect(html).toContain('queue.writeBuffer');
    expect(html).toContain('core/uniforms.ts');
  });

  it('keeps Storage array sizing and instanced drawing visible', () => {
    const html = renderToStaticMarkup(<StorageBuffersArticle />);

    expect(html).toContain('maxStorageBufferBindingSize');
    expect(html).toContain('3 × instanceCount');
    expect(html).toContain('core/storageBuffers.ts');
    expect(html).toContain('vertex pulling');
  });

  it('keeps Vertex Fetch byte layout and slot binding visible', () => {
    const html = renderToStaticMarkup(<VertexBuffersArticle />);

    expect(html).toContain('arrayStride');
    expect(html).toContain('setVertexBuffer');
    expect(html).toContain('60 字节');
    expect(html).toContain('core/vertexBuffers.ts');
  });
});
