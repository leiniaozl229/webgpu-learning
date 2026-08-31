import { Tabs } from '@base-ui/react/tabs';
import { Files } from 'lucide-react';

import computeSource from '../examples/chapter01/compute.ts?raw';
import htmlSource from '../examples/chapter01/index.html?raw';
import renderSource from '../examples/chapter01/render.ts?raw';
import { CodeBlock } from './CodeBlock';

const sourceFiles = [
  { id: 'html', label: 'index.html', language: 'html', code: htmlSource },
  { id: 'render', label: 'src/render.ts', language: 'ts', code: renderSource },
  { id: 'compute', label: 'src/compute.ts', language: 'ts', code: computeSource },
] as const;

export function FundamentalsSourcePanel() {
  return (
    <section className="code-workbench complete-source" aria-labelledby="complete-source-title">
      <header className="code-workbench__header">
        <div className="code-workbench__heading"><Files aria-hidden="true" /><div><strong id="complete-source-title">第一章完整源码</strong><small>HTML、渲染程序与计算程序</small></div></div>
      </header>
      <Tabs.Root className="complete-source__tabs" defaultValue="render">
        <Tabs.List className="editor-tabs" aria-label="第一章完整源码文件">
          {sourceFiles.map((file) => <Tabs.Tab key={file.id} value={file.id}>{file.label}</Tabs.Tab>)}
          <Tabs.Indicator className="editor-tabs__indicator" />
        </Tabs.List>
        {sourceFiles.map((file) => (
          <Tabs.Panel className="complete-source__panel" key={file.id} value={file.id}>
            <CodeBlock label={file.label} language={file.language}>{file.code}</CodeBlock>
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </section>
  );
}
