import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { ChatMessage } from '../types';

marked.setOptions({ gfm: true, breaks: true });

function render(text: string): string {
  return DOMPurify.sanitize(marked.parse(text || '') as string);
}

export default function Chat({
  messages,
  busy,
  onSend,
  onStop,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (t: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const t = value.trim();
    if (!t || busy) return;
    setValue('');
    onSend(t);
  };

  return (
    <div className="chat">
      <div className="msgs">
        {messages.length === 0 && (
          <div className="msg assistant">
            <b>Describe the site you want.</b>
            <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>
              Try: "a dark landing page for a coffee roastery with a menu grid and a
              subscribe form."
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}${m.error ? ' error' : ''}`}>
            {m.role === 'assistant' ? (
              <>
                <div
                  className="md"
                  dangerouslySetInnerHTML={{ __html: render(m.display || (m.streaming ? '…' : '')) }}
                />
                {m.files && Object.keys(m.files).length > 0 && (
                  <div className="chips">
                    {Object.keys(m.files).map((f) => (
                      <span className="chip" key={f}>
                        {f}
                      </span>
                    ))}
                    {(m.deleted ?? []).map((f) => (
                      <span className="chip del" key={f}>
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          value={value}
          placeholder="Describe what to build or change…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="row">
          <span className="hint">Enter to send · Shift+Enter for newline</span>
          {busy ? (
            <button onClick={onStop}>Stop</button>
          ) : (
            <button className="primary" onClick={send}>
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
