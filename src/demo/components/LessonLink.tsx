import type { ComponentProps, MouseEvent } from 'react';

import type { LessonId } from '../navigation';

export const LESSON_NAVIGATION_EVENT = 'webgpu-learning:navigate';

interface LessonLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  lessonId: LessonId;
  hash?: string;
}

export function LessonLink({ lessonId, hash = 'lesson-title', onClick, ...props }: LessonLinkProps) {
  const href = `/?lesson=${lessonId}#${hash}`;

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    event.preventDefault();
    window.history.pushState(null, '', href);
    window.dispatchEvent(new Event(LESSON_NAVIGATION_EVENT));

    function focusTarget(attempt = 0) {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
        return;
      }
      if (attempt < 60) window.requestAnimationFrame(() => focusTarget(attempt + 1));
    }

    window.requestAnimationFrame(() => focusTarget());
  }

  return <a {...props} href={href} onClick={navigate} />;
}
