import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HighlightedCode } from './HighlightedCode';

describe('HighlightedCode', () => {
  it('tokenizes TypeScript keywords', () => {
    const markup = renderToStaticMarkup(
      createElement(HighlightedCode, {
        code: 'const count: number = 3;',
        language: 'typescript',
      }),
    );

    expect(markup).toContain('token keyword');
    expect(markup).toContain('token number');
    expect(markup).toContain('var(--syntax-keyword)');
  });

  it('tokenizes WGSL attributes and built-in types', () => {
    const markup = renderToStaticMarkup(
      createElement(HighlightedCode, {
        code: '@vertex fn main() -> @builtin(position) vec4f { return vec4f(0.0); }',
        language: 'wgsl',
      }),
    );

    expect(markup).toContain('token keyword');
    expect(markup).toContain('token builtin');
    expect(markup).toContain('vec4f');
  });

  it('tokenizes HTML markup used by complete examples', () => {
    const markup = renderToStaticMarkup(
      createElement(HighlightedCode, {
        code: '<canvas id="webgpu-canvas"></canvas>',
        language: 'markup',
      }),
    );

    expect(markup).toContain('token tag');
    expect(markup).toContain('webgpu-canvas');
  });
});
