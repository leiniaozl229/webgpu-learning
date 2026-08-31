import type { TableOfContentsItem } from '../navigation';

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  sourceHref: string;
  variant?: 'inline' | 'sidebar';
}

export function TableOfContents({ items, sourceHref, variant = 'sidebar' }: TableOfContentsProps) {
  return (
    <aside className={`toc toc--${variant}`} aria-label="本页目录">
      <strong>本页内容</strong>
      <nav aria-label="本页章节"><ol>{items.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ol></nav>
      <a className="toc__source" href={sourceHref} target="_blank" rel="noreferrer">查看参考原文</a>
    </aside>
  );
}
