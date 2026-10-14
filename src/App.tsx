import { useCallback, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import Chat from './components/Chat';
import Workspace from './components/Workspace';
import SettingsModal from './components/SettingsModal';
import { streamChat } from './lib/zai';
import { SYSTEM_PROMPT, buildContext, parseReply, stripBlocks } from './lib/agent';
import { buildPreview } from './lib/preview';
import { exportZip, importZip, loadProjects, saveProjects } from './lib/storage';
import type { ChatMessage, FileMap, LogLine, Project, Settings } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

const STARTER: FileMap = {
  'index.html': `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>My Site</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main>
    <h1>Hello from Venice Agent</h1>
    <p>Describe what you want and watch it build.</p>
    <button id="go">Click me</button>
  </main>
  <script src="app.js"></script>
</body>
</html>
`,
  'styles.css': `:root { color-scheme: dark; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0e1525; color: #e6edf3; display: grid; place-items: center; min-height: 100vh; }
main { text-align: center; }
button { padding: .6rem 1.2rem; border-radius: 8px; border: 0; background: #f26207; color: #fff; cursor: pointer; font-size: 1rem; }
`,
  'app.js': `document.getElementById('go')?.addEventListener('click', () => alert('It works.'));
`,
};

function newProject(): Project {
  return { id: uid(), name: 'untitled', files: { ...STARTER }, messages: [], updatedAt: Date.now() };
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => ({
    apiKey: localStorage.getItem('va.key') ?? '',
    baseUrl: localStorage.getItem('va.baseUrl') ?? '/zai/api/paas/v4',
    model: localStorage.getItem('va.model') ?? 'glm-5.2',
    autoFix: (localStorage.getItem('va.autoFix') ?? '1') === '1',
    temperature: Number(localStorage.getItem('va.temp') ?? 0.6),
    maxTokens: Number(localStorage.getItem('va.maxTokens') ?? 8192),
  }));

  useEffect(() => {
    localStorage.setItem('va.key', settings.apiKey);
    localStorage.setItem('va.baseUrl', settings.baseUrl);
    localStorage.setItem('va.model', settings.model);
    localStorage.setItem('va.autoFix', settings.autoFix ? '1' : '0');
    localStorage.setItem('va.temp', String(settings.temperature));
    localStorage.setItem('va.maxTokens', String(settings.maxTokens));
  }, [settings]);

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = loadProjects();
    return saved.length ? saved : [newProject()];
  });
  const [currentId, setCurrentId] = useState(() => projects[0].id);
  const [active, setActive] = useState('index.html');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(() => buildPreview(projects[0].files));
  const [previewKey, setPreviewKey] = useState(0);

  const project = projects.find((p) => p.id === currentId) ?? projects[0];

  const log = useCallback((level: LogLine['level'], text: string) => {
    setLogs((l) => [...l.slice(-400), { id: uid(), t: Date.now(), level, text }]);
  }, []);

  const patch = useCallback(
    (fn: (p: Project) => Project) =>
      setProjects((prev) => prev.map((p) => (p.id === currentId ? { ...fn(p), updatedAt: Date.now() } : p))),
    [currentId]
  );

  const setFiles = useCallback((fn: (f: FileMap) => FileMap) => patch((p) => ({ ...p, files: fn(p.files) })), [patch]);
  const setMessages = useCallback((fn: (m: ChatMessage[]) => ChatMessage[]) => patch((p) => ({ ...p, messages: fn(p.messages) })), [patch]);

  useEffect(() => {
    const t = setTimeout(() => saveProjects(projects), 400);
    return () => clearTimeout(t);
  }, [projects]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPreviewHtml(buildPreview(project.files));
      setPreviewKey((k) => k + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [project.files]);

  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoFixRef = useRef(0);
  const pendingRef = useRef<string[]>([]);
  const autoFixTimer = useRef<number | null>(null);

  const runAgent = useCallback(
    async (userText: string, opts: { auto?: boolean } = {}) => {
      if (busyRef.current) return;
      if (!settings.apiKey) {
        log('warn', 'No API key — open Settings');
        setShowSettings(true);
        return;
      }

      const p = projects.find((x) => x.id === currentId)!;
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: buildContext(p.files) },
        ...p.messages.filter((m) => m.role !== 'system').map((m) => ({
          role: m.role,
          content: m.display ?? m.content,
        })),
        { role: 'user', content: userText },
      ];

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        opts.auto
          ? { id: uid(), role: 'system', content: 'auto-fix triggered' }
          : { id: uid(), role: 'user', content: userText },
        { id: assistantId, role: 'assistant', content: '', display: '', streaming: true },
      ]);

      busyRef.current = true;
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      log('info', `→ ${settings.model} (${userText.length} chars)`);

      let raw = '';
      try {
        for await (const chunk of streamChat(settings, apiMessages, controller.signal)) {
          if (chunk.type === 'delta' && chunk.text) {
            raw += chunk.text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: raw, display: stripBlocks(raw) } : m))
            );
          } else if (chunk.type === 'done') break;
        }

        const parsed = parseReply(raw);
        const written = Object.keys(parsed.files);

        setFiles((f) => {
          const next = { ...f };
          for (const d of parsed.deletes) delete next[d];
          for (const [k, v] of Object.entries(parsed.files)) next[k] = v;
          return next;
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: raw, display: parsed.text, files: parsed.files, deleted: parsed.deletes, streaming: false }
              : m
          )
        );

        log('success', `applied ${written.length} file(s)${parsed.deletes.length ? `, deleted ${parsed.deletes.length}` : ''}`);
        if (written.length && !opts.auto) autoFixRef.current = 0;
        if (written[0]) setActive(written[0]);
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          log('warn', 'stopped');
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
        } else {
          const msg = e?.message ?? String(e);
          log('error', msg);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, display: `**Error:** ${msg}`, error: true, streaming: false } : m))
          );
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
      }
    },
    [settings, projects, currentId, log, setFiles, setMessages]
  );

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__va !== 1) return;

      if (d.t === 'error') {
        const msg: string = d.p?.message ?? 'error';
        log('error', 'preview: ' + msg);
        pendingRef.current.push(
          msg + (d.p?.stack ? '\n  ' + String(d.p.stack).split('\n').slice(1, 4).join('\n  ') : '')
        );

        if (settings.autoFix && !busyRef.current && autoFixRef.current < 3) {
          if (autoFixTimer.current) window.clearTimeout(autoFixTimer.current);
          autoFixTimer.current = window.setTimeout(() => {
            const errs = Array.from(new Set(pendingRef.current)).slice(0, 6);
            pendingRef.current = [];
            if (!errs.length || busyRef.current) return;
            autoFixRef.current += 1;
            runAgent(
              `The live preview threw these runtime errors. Find the root cause and fix the files:\n\n${errs
                .map((x) => '• ' + x)
                .join('\n')}`,
              { auto: true }
            );
          }, 900);
        }
      } else if (d.t === 'console') {
        log(d.p?.level === 'error' ? 'error' : 'info', 'console: ' + (d.p?.args ?? []).join(' '));
      } else if (d.t === 'ready') {
        log('info', 'preview reloaded');
        pendingRef.current = [];
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [settings.autoFix, runAgent, log]);

  const refresh = () => {
    setPreviewHtml(buildPreview(project.files));
    setPreviewKey((k) => k + 1);
  };

  return (
    <div className="app">
      <TopBar
        name={project.name}
        onRename={(v) => patch((p) => ({ ...p, name: v }))}
        model={settings.model}
        projects={projects}
        onLoad={(id) => {
          setCurrentId(id);
          const t = projects.find((x) => x.id === id);
          if (t) {
            setActive(Object.keys(t.files)[0] ?? 'index.html');
            setPreviewHtml(buildPreview(t.files));
            setPreviewKey((k) => k + 1);
          }
        }}
        onNew={() => {
          const p = newProject();
          setProjects((prev) => [...prev, p]);
          setCurrentId(p.id);
          setActive('index.html');
        }}
        onSave={() => {
          saveProjects(projects);
          log('success', 'saved');
        }}
        onExport={() => exportZip(project.files, project.name)}
        onImport={async (f) => {
          const files = await importZip(f);
          setFiles(() => files);
          setActive(Object.keys(files)[0] ?? 'index.html');
          log('success', `imported ${Object.keys(files).length} file(s)`);
        }}
        autoFix={settings.autoFix}
        toggleAutoFix={() => setSettings({ ...settings, autoFix: !settings.autoFix })}
        onSettings={() => setShowSettings(true)}
      />

      <div className="main">
        <Chat
          messages={project.messages}
          busy={busy}
          onSend={(t) => {
            autoFixRef.current = 0;
            runAgent(t);
          }}
          onStop={() => abortRef.current?.abort()}
        />
        <Workspace
          files={project.files}
          active={active}
          previewHtml={previewHtml}
          previewKey={previewKey}
          logs={logs}
          onSelect={setActive}
          onChange={(p, v) => setFiles((f) => ({ ...f, [p]: v }))}
          onAdd={(p) => {
            setFiles((f) => ({ ...f, [p]: '' }));
            setActive(p);
          }}
          onDelete={(p) => {
            setFiles((f) => {
              const n = { ...f };
              delete n[p];
              return n;
            });
            if (active === p) setActive(Object.keys(project.files).find((x) => x !== p) ?? '');
          }}
          onRefresh={refresh}
        />
      </div>

      {showSettings && (
        <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
