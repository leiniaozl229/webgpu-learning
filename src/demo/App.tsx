import { lazy, Suspense, useEffect, useState } from 'react';

import { LESSON_NAVIGATION_EVENT } from './components/LessonLink';
import { Sidebar } from './components/Sidebar';
import { SiteHeader } from './components/SiteHeader';
import { TableOfContents } from './components/TableOfContents';
import { WebgpuFundamentalsArticle } from './components/WebgpuFundamentalsArticle';
import { type LessonId, readLessonId, sourceByLesson, tableOfContentsByLesson } from './navigation';

type Theme = 'light' | 'dark';

const lessonTitles: Record<LessonId, string> = {
  fundamentals: 'WebGPU 基础',
  'how-it-works': 'WebGPU 工作原理',
  'wgsl-interstage': 'Inter-stage 变量',
  uniforms: 'Uniforms',
  'storage-buffers': '存储缓冲区',
  'vertex-buffers': '顶点缓冲区',
  textures: '纹理基础',
  'image-textures': '加载图像',
  'video-textures': '高效使用视频',
  'cube-maps': '立方体贴图',
  'storage-textures': '存储纹理',
  msaa: '多重采样 / MSAA',
  compute: '计算着色器基础',
};

const HowWebgpuWorksArticle = lazy(async () => ({
  default: (await import('./components/HowWebgpuWorksArticle')).HowWebgpuWorksArticle,
}));
const WgslInterstageArticle = lazy(async () => ({
  default: (await import('./components/WgslInterstageArticle')).WgslInterstageArticle,
}));
const UniformsArticle = lazy(async () => ({
  default: (await import('./components/UniformsArticle')).UniformsArticle,
}));
const StorageBuffersArticle = lazy(async () => ({
  default: (await import('./components/StorageBuffersArticle')).StorageBuffersArticle,
}));
const VertexBuffersArticle = lazy(async () => ({
  default: (await import('./components/VertexBuffersArticle')).VertexBuffersArticle,
}));
const TexturesArticle = lazy(async () => ({
  default: (await import('./components/TexturesArticle')).TexturesArticle,
}));
const ImageTexturesArticle = lazy(async () => ({
  default: (await import('./components/ImageTexturesArticle')).ImageTexturesArticle,
}));
const VideoTexturesArticle = lazy(async () => ({
  default: (await import('./components/VideoTexturesArticle')).VideoTexturesArticle,
}));
const CubeMapsArticle = lazy(async () => ({
  default: (await import('./components/CubeMapsArticle')).CubeMapsArticle,
}));
const StorageTexturesArticle = lazy(async () => ({
  default: (await import('./components/StorageTexturesArticle')).StorageTexturesArticle,
}));
const MsaaArticle = lazy(async () => ({
  default: (await import('./components/MsaaArticle')).MsaaArticle,
}));
const ComputeArticle = lazy(async () => ({
  default: (await import('./components/ComputeArticle')).ComputeArticle,
}));

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('webgpu-learning-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readInitialSidebarCollapsed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('webgpu-learning-sidebar-collapsed') === 'true';
}

function readInitialDesktopLayout() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(min-width: 56rem)').matches;
}

export function App() {
  const [lessonId, setLessonId] = useState(readLessonId);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readInitialSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(readInitialDesktopLayout);

  useEffect(() => {
    const updateLesson = () => setLessonId(readLessonId());
    window.addEventListener('popstate', updateLesson);
    window.addEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    return () => {
      window.removeEventListener('popstate', updateLesson);
      window.removeEventListener(LESSON_NAVIGATION_EVENT, updateLesson);
    };
  }, []);

  useEffect(() => {
    document.title = `${lessonTitles[lessonId]} · WebGPU Learning`;
  }, [lessonId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#20232a' : '#f7f9fb',
    );
    window.localStorage.setItem('webgpu-learning-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem('webgpu-learning-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 56rem)');
    const updateLayout = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) setMenuOpen(false);
    };
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (!menuOpen || isDesktop) return;
    const previousOverflow = document.body.style.overflow;
    const outsideElements = [
      document.querySelector<HTMLElement>('.skip-link'),
      document.querySelector<HTMLElement>('.site-header'),
      document.querySelector<HTMLElement>('.main-content'),
    ].filter((element): element is HTMLElement => element !== null);
    const previousInert = outsideElements.map((element) => element.inert);
    const sidebar = document.getElementById('course-sidebar');
    document.body.style.overflow = 'hidden';
    outsideElements.forEach((element) => { element.inert = true; });
    document.querySelector<HTMLButtonElement>('.sidebar__mobile-header button')?.focus();

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = Array.from(sidebar.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sidebar.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sidebar.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      outsideElements.forEach((element, index) => { element.inert = previousInert[index]; });
      window.removeEventListener('keydown', handleDialogKey);
      document.querySelector<HTMLButtonElement>('.mobile-menu-button')?.focus();
    };
  }, [isDesktop, menuOpen]);

  const inlineTableOfContents = (
    <TableOfContents
      items={tableOfContentsByLesson[lessonId]}
      sourceHref={sourceByLesson[lessonId]}
      variant="inline"
    />
  );

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content">跳到正文</a>
      <SiteHeader
        theme={theme}
        menuOpen={menuOpen}
        sidebarCollapsed={sidebarCollapsed}
        onThemeChange={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
        onMenuOpen={() => setMenuOpen(true)}
        onSidebarToggle={() => setSidebarCollapsed((value) => !value)}
      />
      <Sidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        isDesktop={isDesktop}
        lessonId={lessonId}
        onClose={() => setMenuOpen(false)}
      />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <Suspense fallback={<div className="lesson-loading" role="status">正在加载课程…</div>}>
          {lessonId === 'fundamentals' && <WebgpuFundamentalsArticle toc={inlineTableOfContents} />}
          {lessonId === 'how-it-works' && <HowWebgpuWorksArticle toc={inlineTableOfContents} />}
          {lessonId === 'wgsl-interstage' && <WgslInterstageArticle toc={inlineTableOfContents} />}
          {lessonId === 'uniforms' && <UniformsArticle toc={inlineTableOfContents} />}
          {lessonId === 'storage-buffers' && <StorageBuffersArticle toc={inlineTableOfContents} />}
          {lessonId === 'vertex-buffers' && <VertexBuffersArticle toc={inlineTableOfContents} />}
          {lessonId === 'textures' && <TexturesArticle toc={inlineTableOfContents} />}
          {lessonId === 'image-textures' && <ImageTexturesArticle toc={inlineTableOfContents} />}
          {lessonId === 'video-textures' && <VideoTexturesArticle toc={inlineTableOfContents} />}
          {lessonId === 'cube-maps' && <CubeMapsArticle toc={inlineTableOfContents} />}
          {lessonId === 'storage-textures' && <StorageTexturesArticle toc={inlineTableOfContents} />}
          {lessonId === 'msaa' && <MsaaArticle toc={inlineTableOfContents} />}
          {lessonId === 'compute' && <ComputeArticle toc={inlineTableOfContents} />}
        </Suspense>
        <TableOfContents
          items={tableOfContentsByLesson[lessonId]}
          sourceHref={sourceByLesson[lessonId]}
          variant="sidebar"
        />
      </main>
    </div>
  );
}
