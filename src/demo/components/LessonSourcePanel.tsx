import { Tabs } from '@base-ui/react/tabs';
import { Files } from 'lucide-react';

import { CodeBlock } from './CodeBlock';

export interface LessonSourceFile {
  id: string;
  label: string;
  language?: string;
  code: string;
}

interface LessonSourcePanelProps {
  title: string;
  description: string;
  files: readonly LessonSourceFile[];
  defaultFile?: string;
}

export function LessonSourcePanel({
  title,
  description,
  files,
  defaultFile = files[0]?.id,
}: LessonSourcePanelProps) {
  if (!defaultFile) return null;

  return (
    <section className="code-workbench complete-source" aria-label={title}>
      <header className="code-workbench__header">
        <div className="code-workbench__heading">
          <Files aria-hidden="true" />
          <div><strong>{title}</strong><small>{description}</small></div>
        </div>
      </header>
      <Tabs.Root className="complete-source__tabs" defaultValue={defaultFile}>
        <Tabs.List className="editor-tabs" aria-label={`${title}文件`}>
          {files.map((file) => <Tabs.Tab key={file.id} value={file.id}>{file.label}</Tabs.Tab>)}
          <Tabs.Indicator className="editor-tabs__indicator" />
        </Tabs.List>
        {files.map((file) => (
          <Tabs.Panel className="complete-source__panel" key={file.id} value={file.id}>
            <CodeBlock label={file.label} language={file.language}>{file.code}</CodeBlock>
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </section>
  );
}
