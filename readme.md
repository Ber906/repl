# Venice Agent

A Replit-Agent-style coding workspace. You describe a site, GLM writes the files,
they appear in the editor, and the live preview updates. Runtime errors are caught
and fed back to the agent so it patches itself.

## Run

    npm install
    npm run dev

Open the printed URL, click **Settings**, paste your z.ai API key, hit **Done**.

## Why the dev server matters

`api.z.ai` currently drops CORS headers on OPTIONS preflight, so a browser calling
it directly fails. `vite.config.ts` proxies `/zai` → `https://api.z.ai`, making the
call same-origin. Keep the base URL on the "Dev proxy" preset while developing.

If z.ai fixes CORS, switch the preset to "Direct z.ai" — no other changes needed.

## Features

- Streaming chat with GLM
- Multi-file generation with a file tree
- Monaco editor with syntax highlighting
- Live preview iframe with console + error capture
- Auto-fix loop (agent reads errors, patches code, up to 3 passes)
- ZIP export / import
- Per-browser project persistence
- Model switcher

## Notes

- Generated apps are static (HTML/CSS/JS, CDN libraries) so they run in an iframe.
- `npm run build` produces static output; the proxy only exists in `dev`/`preview`,
  so a deployed build needs a real reverse proxy or a CORS fix.
