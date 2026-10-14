import type { Settings } from '../types';

const PRESETS = [
  { label: 'Dev proxy (recommended)', url: '/zai/api/paas/v4' },
  { label: 'Direct z.ai', url: 'https://api.z.ai/api/paas/v4' },
  { label: 'Coding plan (proxy)', url: '/zai/api/coding/paas/v4' },
];

const MODELS = ['glm-5.2', 'glm-5.3', 'glm-4.7', 'glm-4.6', 'glm-4.5-air', 'glm-5.3-flash'];

export default function SettingsModal({
  settings,
  setSettings,
  onClose,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings({ ...settings, [k]: v });

  return (
    <div className="modal" onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <label>
          z.ai API key
          <input
            type="password"
            value={settings.apiKey}
            placeholder="your-api-key"
            onChange={(e) => set('apiKey', e.target.value)}
          />
        </label>

        <label>
          Base URL
          <input value={settings.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} />
        </label>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.url} onClick={() => set('baseUrl', p.url)}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="note">
          Use the dev proxy while running <code>npm run dev</code> — z.ai's API currently omits CORS
          headers on preflight, so direct browser calls fail.
        </p>

        <label>
          Model
          <select value={settings.model} onChange={(e) => set('model', e.target.value)}>
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className="row">
          <label style={{ flex: 1 }}>
            Temperature
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={settings.temperature}
              onChange={(e) => set('temperature', Number(e.target.value))}
            />
          </label>
          <label style={{ flex: 1 }}>
            Max tokens
            <input
              type="number"
              step="512"
              min="256"
              value={settings.maxTokens}
              onChange={(e) => set('maxTokens', Number(e.target.value))}
            />
          </label>
        </div>

        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={settings.autoFix}
            onChange={(e) => set('autoFix', e.target.checked)}
          />
          Auto-fix loop (agent patches runtime errors it sees)
        </label>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
