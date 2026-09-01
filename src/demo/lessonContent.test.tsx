import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ComputeArticle } from './components/ComputeArticle';
import { CubeMapsArticle } from './components/CubeMapsArticle';
import { HowWebgpuWorksArticle } from './components/HowWebgpuWorksArticle';
import { ImageTexturesArticle } from './components/ImageTexturesArticle';
import { MsaaArticle } from './components/MsaaArticle';
import { StorageBuffersArticle } from './components/StorageBuffersArticle';
import { StorageTexturesArticle } from './components/StorageTexturesArticle';
import { TexturesArticle } from './components/TexturesArticle';
import { UniformsArticle } from './components/UniformsArticle';
import { VertexBuffersArticle } from './components/VertexBuffersArticle';
import { VideoTexturesArticle } from './components/VideoTexturesArticle';
import { WebgpuFundamentalsArticle } from './components/WebgpuFundamentalsArticle';
import { WgslInterstageArticle } from './components/WgslInterstageArticle';
import { type LessonId, tableOfContentsByLesson } from './navigation';

const articles: Record<LessonId, ReactNode> = {
  fundamentals: <WebgpuFundamentalsArticle />,
  'wgsl-interstage': <WgslInterstageArticle />,
  uniforms: <UniformsArticle />,
  'storage-buffers': <StorageBuffersArticle />,
  'vertex-buffers': <VertexBuffersArticle />,
  textures: <TexturesArticle />,
  'image-textures': <ImageTexturesArticle />,
  'video-textures': <VideoTexturesArticle />,
  'cube-maps': <CubeMapsArticle />,
  'storage-textures': <StorageTexturesArticle />,
  msaa: <MsaaArticle />,
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

describe('texture lessons', () => {
  it('keeps Texture, Sampler and writeTexture connected', () => {
    const html = renderToStaticMarkup(<TexturesArticle />);
    expect(html).toContain('queue.writeTexture');
    expect(html).toContain('textureSample');
    expect(html).toContain('core/textures.ts');
  });

  it('keeps image decode, external copy and ImageBitmap cleanup visible', () => {
    const html = renderToStaticMarkup(<ImageTexturesArticle />);
    expect(html).toContain('createImageBitmap');
    expect(html).toContain('copyExternalImageToTexture');
    expect(html).toContain('bitmap.close');
  });

  it('keeps External Texture frame lifetime visible', () => {
    const html = renderToStaticMarkup(<VideoTexturesArticle />);
    expect(html).toContain('importExternalTexture');
    expect(html).toContain('texture_external');
    expect(html).toContain('textureSampleBaseClampToEdge');
  });

  it('keeps all six Cube Map layers and direction sampling visible', () => {
    const html = renderToStaticMarkup(<CubeMapsArticle />);
    expect(html).toContain('+X、−X、+Y、−Y、+Z、−Z');
    expect(html).toContain("dimension: &#x27;cube&#x27;");
    expect(html).toContain('texture_cube');
  });

  it('keeps Compute and Render passes connected through a Storage Texture', () => {
    const html = renderToStaticMarkup(<StorageTexturesArticle />);
    expect(html).toContain('texture_storage_2d');
    expect(html).toContain('32 × 32 个工作组');
    expect(html).toContain('textureStore');
  });

  it('keeps multisample attachment and resolveTarget visible', () => {
    const html = renderToStaticMarkup(<MsaaArticle />);
    expect(html).toContain('sampleCount 均为 4');
    expect(html).toContain('resolveTarget');
    expect(html).toContain('core/msaa.ts');
  });
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
