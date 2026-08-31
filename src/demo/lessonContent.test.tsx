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
