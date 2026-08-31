import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App server rendering', () => {
  it('renders the default WebGPU lesson without browser globals', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('WebGPU Learning');
    expect(html).toContain('WebGPU 基础');
    expect(html).toContain('课程导航');
  });
});
