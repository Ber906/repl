import type { FileMap } from '../types';

// Injected first into every preview so the parent can hear about failures.
const CAPTURE = `<script>
(function(){
  var send=function(t,p){try{parent.postMessage({__va:1,t:t,p:p},'*')}catch(e){}};
  window.onerror=function(m,s,l,c,e){send('error',{message:String(m),src:s,line:l,col:c,stack:e&&e.stack})};
  window.addEventListener('unhandledrejection',function(ev){var r=ev.reason;send('error',{message:'Unhandled rejection: '+(r&&r.message?r.message:String(r))})});
  var ce=console.error;console.error=function(){send('console',{level:'error',args:[].slice.call(arguments).map(String)});ce.apply(console,arguments)};
  var cl=console.log;console.log=function(){send('console',{level:'log',args:[].slice.call(arguments).map(String)});cl.apply(console,arguments)};
  window.addEventListener('load',function(){send('ready',{})});
})();
</script>`;

function dirOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i + 1);
}

function resolve(base: string, rel: string): string | null {
  if (/^(https?:)?\/\//.test(rel) || rel.startsWith('data:') || rel.startsWith('#')) return null;
  const out: string[] = [];
  for (const part of (base + rel).split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

export function buildPreview(files: FileMap): string {
  const names = Object.keys(files);
  const index =
    names.find((n) => /(^|\/)index\.html?$/i.test(n)) ?? names.find((n) => /\.html?$/i.test(n));

  if (!index) {
    return `<!doctype html><html><head><meta charset="utf-8">${CAPTURE}</head>
<body style="font-family:system-ui;background:#0e1525;color:#e6edf3;padding:24px">
<h2>No HTML file yet</h2><p>${names.join(', ') || 'empty project'}</p></body></html>`;
  }

  const base = dirOf(index);
  let html = files[index];

  html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (m, href) => {
    const p = resolve(base, href);
    return p && files[p] != null ? `<style data-from="${p}">\n${files[p]}\n</style>` : m;
  });

  html = html.replace(
    /<script\b[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (m, src) => {
      const p = resolve(base, src);
      return p && files[p] != null ? `<script data-from="${p}">\n${files[p]}\n</script>` : m;
    }
  );

  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (h) => h + CAPTURE);
  else html = CAPTURE + html;

  return html;
}
