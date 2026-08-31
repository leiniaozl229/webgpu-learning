import { forwardRef } from 'react';
import { Highlight, Prism, type PrismTheme } from 'prism-react-renderer';

if (!Prism.languages.wgsl) {
  Prism.languages.wgsl = {
    comment: /\/\*[\s\S]*?\*\/|\/\/.*$/m,
    attribute: {
      pattern: /@[a-z_]+/i,
      alias: 'keyword',
    },
    keyword: /\b(?:alias|break|case|const|const_assert|continue|continuing|default|diagnostic|discard|else|enable|false|fn|for|if|let|loop|override|requires|return|struct|switch|true|var|while)\b/,
    builtin: /\b(?:array|atomic|bool|f16|f32|i32|mat[234]x[234][fh]|ptr|sampler|sampler_comparison|texture_[a-z0-9_]+|u32|vec[234][fhiu])\b/,
    number: /\b(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)[fhiu]?\b/i,
    operator: /->|&&|\|\||<<|>>|[-+*/%=&|^!<>]=?|[?:]/,
    punctuation: /[{}\[\];(),.]/,
  };
}

const codeTheme: PrismTheme = {
  plain: {
    color: 'var(--color-code-text)',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: 'var(--syntax-comment)', fontStyle: 'italic' } },
    { types: ['keyword', 'selector', 'important'], style: { color: 'var(--syntax-keyword)' } },
    { types: ['builtin', 'class-name', 'type'], style: { color: 'var(--syntax-type)' } },
    { types: ['function'], style: { color: 'var(--syntax-function)' } },
    { types: ['string', 'char', 'attr-value'], style: { color: 'var(--syntax-string)' } },
    { types: ['number', 'boolean', 'constant'], style: { color: 'var(--syntax-number)' } },
    { types: ['operator', 'punctuation'], style: { color: 'var(--syntax-operator)' } },
    { types: ['property', 'tag'], style: { color: 'var(--syntax-property)' } },
  ],
};

interface HighlightedCodeProps {
  code: string;
  language: 'typescript' | 'wgsl';
  className?: string;
  ariaHidden?: boolean;
}

export const HighlightedCode = forwardRef<HTMLPreElement, HighlightedCodeProps>(
  function HighlightedCode({ code, language, className, ariaHidden = false }, ref) {
    return (
      <Highlight theme={codeTheme} code={code} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre ref={ref} className={className} aria-hidden={ariaHidden || undefined}>
            <code>
              {tokens.map((line, lineIndex) => (
                <span key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    );
  },
);
