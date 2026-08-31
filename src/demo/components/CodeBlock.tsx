import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { HighlightedCode } from './HighlightedCode';

interface CodeBlockProps {
  children: string;
  language?: string;
  label?: string;
}

export function CodeBlock({ children, language = 'ts', label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyCode() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
  }

  return (
    <figure className="code-block">
      <figcaption>
        <span>{label ?? language}</span>
        <button type="button" onClick={copyCode}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}<span aria-live="polite">{copied ? '已复制' : '复制'}</span>
        </button>
      </figcaption>
      <HighlightedCode
        code={children}
        language={language === 'wgsl' ? 'wgsl' : language === 'html' ? 'markup' : 'typescript'}
      />
    </figure>
  );
}
