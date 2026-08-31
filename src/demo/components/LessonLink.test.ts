import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonLink } from './LessonLink';

describe('LessonLink', () => {
  it('renders a crawlable lesson URL while enhancing clicks on the client', () => {
    const markup = renderToStaticMarkup(
      createElement(LessonLink, { lessonId: 'fundamentals' }, '返回基础课'),
    );

    expect(markup).toContain('href="/?lesson=fundamentals#lesson-title"');
    expect(markup).toContain('返回基础课');
  });
});
