import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { FileMap, LogLine } from '../types';

function langOf(path: string): string {
  if (/\.html?$/i.test(path)) return 'html';
  if (/\.css$/i.test(path)) return 'css';
  if (/\.json$/i.test(path)) return 'json';
  if (/\.md$/i.test(path)) return 'markdown';
  if (/\.tsx?$/i.test(path)) return 'typescript';
  return 'javascript';
}

export default function Workspace({
  files,
  active,
  previewHtml,
  previewKey,
  logs,
  onSelect,
  onChange,
  onAdd,
  onDelete,
  onRefresh,
}: {
  files: FileMap;
  active: string;
  previewHtml: string;
  previewKey: number;
  logs: LogLine[];
  onSelect: (p: string) => void;
  onChange: (p: string, v: string) => void;
  onAdd: (p: string) => void;
  onDelete: (p: string) => void;
  onRefresh: () => void;
}) {
  const names = Object.keys(files).sort();
  const termRef = useRef<HTMLDivElement>(null);
  const [wrap, setWrap] = useState(true);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="work">
      <div className="side">
        <div className="head">
          Files
          <div className="spacer" style={{ flex: 1 }} />
          <button
            title="New file"
            onClick={() => {
              const p = prompt('New file path', 'new.js');
              if (p) onAdd(p.trim());
            }}
          >
            +
          </button>
        </div>
        <div className="tree">
          {names.map((n) => (
            <div
              key={n}
              className={`f${n === active ? ' active' : ''}`}
              onClick={() => onSelect(n)}
            >
              <span>{n}</span>
              <span
                className="x"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${n}?`)) onDelete(n);
                }}
              >
                ✕
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="editor">
        <div className="head">
          {active || 'no file'}
          <div style={{ flex: 1 }} />
          <button onClick={() => setWrap((w) => !w)}>{wrap ? 'No wrap' : 'Wrap'}</button>
        </div>
        <div className="body">
          <Editor
            key={active}
            height="100%"
            theme="vs-dark"
            path={active}
            language={langOf(active)}
            value={files[active] ?? ''}
            onChange={(v) => onChange(active, v ?? '')}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: wrap ? 'on' : 'off',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 2,
            }}
          />
        </div>
      </div>

      <div className="right">
        <div className="head">
          Preview
          <div className="spacer" />
          <button onClick={onRefresh}>Reload</button>
        </div>
        <iframe
          key={previewKey}
          title="preview"
          srcDoc={previewHtml}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        />
        <div className="term" ref={termRef}>
          {logs.map((l) => (
            <div className="l" key={l.id}>
              <span className="t">
                {new Date(l.t).toLocaleTimeString([], { hour12: false })}{' '}
              </span>
              <span className={l.level}>{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
