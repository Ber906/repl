import type { Settings } from '../types';

export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  text?: string;
  error?: string;
}

export async function* streamChat(
  settings: Settings,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const base = settings.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
      'Accept-Language': 'en-US,en',
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 400) || res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') {
        yield { type: 'done' };
        return;
      }
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield { type: 'delta', text: delta };
      } catch {
        /* keep-alive or partial frame */
      }
    }
  }
  yield { type: 'done' };
}
