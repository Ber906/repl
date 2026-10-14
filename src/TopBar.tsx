import type { Project } from '../types';

export default function TopBar({
  name,
  onRename,
  model,
  projects,
  onLoad,
  onNew,
  onSave,
  onExport,
  onImport,
  autoFix,
  toggleAutoFix,
  onSettings,
}: {
  name: string;
  onRename: (v: string) => void;
  model: string;
  projects: Project[];
  onLoad: (id: string) => void;
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (f: File) => void;
  autoFix: boolean;
  toggleAutoFix: () => void;
  onSettings: () => void;
}) {
  return (
    <div className="topbar">
      <div className="brand">
        Venice<span>Agent</span>
      </div>

      <input
        className="name"
        value={name}
        onChange={(e) => onRename(e.target.value)}
        placeholder="project name"
      />

      <button onClick={onNew}>New</button>
      <button onClick={onSave}>Save</button>

      <select value="" onChange={(e) => e.target.value && onLoad(e.target.value)}>
        <option value="">Load…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <button onClick={onExport}>Export .zip</button>
      <label className="btnlike">
        <button onClick={(e) => (e.currentTarget.nextSibling as HTMLInputElement).click()}>
          Import .zip
        </button>
        <input
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
        />
      </label>

      <div className="spacer" />

      <button className={autoFix ? 'on' : ''} onClick={toggleAutoFix} title="Auto-fix runtime errors">
        Auto-fix {autoFix ? 'on' : 'off'}
      </button>
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>{model}</span>
      <button onClick={onSettings}>Settings</button>
    </div>
  );
}
