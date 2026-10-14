import type { FileMap } from '../types';

export const SYSTEM_PROMPT = `You are Venice Agent, an autonomous senior web engineer that builds and edits complete websites inside a live sandbox.

## Reply format
1. A SHORT markdown note (1-4 sentences). No essays.
2. Then one block per file you create or overwrite, in EXACTLY this shape:

<file path="index.html">
<!doctype html>
...the full file contents...
</file>

3. To delete a file: <delete path="old.css" />

Rules:
- Inside a <file> block emit the FULL contents. Never "..." or partial snippets.
- Only emit files that actually changed.
- Never wrap file contents in markdown code fences.

## What you build
- Static sites that run directly in an <iframe> with no build step: index.html, styles.css, app.js (split into more files when it helps).
- Pull libraries from CDNs with plain <script src> and <link rel="stylesheet">. Avoid bundlers and local ES module imports.
- Vanilla HTML/CSS/JS by default. Use React from a CDN only if the app truly needs it.
- Make it look designed: real layout, spacing, colour, responsive breakpoints.
- Keep logic in .js and styles in .css rather than stuffing everything into index.html.

## Debugging
- If runtime errors from the preview are given to you, find the root cause and fix the files. Emit the corrected files in full.
- Never blame the environment. Just fix it.

## Context
You are shown the current file tree and contents. Build incrementally on what exists.`;

export interface ParsedReply {
  text: string;
  files: FileMap;
  deletes: string[];
}

const FILE_RE = /<file\s+path="([^"]+)"\s*>([\s\S]*?)<\/file>/g;
const DEL_RE = /<delete\s+path="([^"]+)"\s*\/?>/g;

export function parseReply(raw: string): ParsedReply {
  const files: FileMap = {};
  const deletes: string[] = [];
  FILE_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = FILE_RE.exec(raw))) {
    const path = m[1].trim();
    const body = m[2].replace(/^\n/, '').replace(/\n$/, '');
    if (path) files[path] = body;
  }

  DEL_RE.lastIndex = 0;
  while ((m = DEL_RE.exec(raw))) deletes.push(m[1].trim());

  return { text: stripBlocks(raw), files, deletes };
}

export function stripBlocks(raw: string): string {
  let t = raw.replace(/<file\s+path="[^"]+"\s*>[\s\S]*?<\/file>/g, '');
  const i = t.indexOf('<file');
  if (i !== -1) t = t.slice(0, i);
  t = t.replace(/<delete\s+path="[^"]+"\s*\/?>/g, '');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

export function buildContext(files: FileMap): string {
  const names = Object.keys(files).sort();
  let out = 'CURRENT PROJECT FILES (live state):\n';
  out += names.length ? names.map((n) => `- ${n}`).join('\n') : '(empty)';
  out += '\n\n---\n';
  for (const n of names) {
    const body =
      files[n].length > 8000 ? files[n].slice(0, 8000) + '\n/* …truncated… */' : files[n];
    out += `\n<<<${n}>>>\n${body}\n`;
  }
  return out;
}
