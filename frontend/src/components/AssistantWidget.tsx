import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../lib/api';
import { Icon } from './Icon';
import { AiSourceTag, ErrorBanner } from './ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
}

const SUGGESTIONS = [
  'Which tenants have overdue rent?',
  'Which rooms are vacant?',
  'Which leases expire this month?',
  'What is my total revenue?',
];

/**
 * Floating support-style assistant for owners. A bubble at bottom-right that
 * opens a small chat panel. Answers come from live data only.
 */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const convo = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (question: string) =>
      (await api.post('/owner/assistant/ask', { question, conversationId: convo.current })).data.data,
    onSuccess: (data) => {
      convo.current = data.conversationId;
      setMessages((m) => [...m, { role: 'assistant', content: data.message.content, source: data.source }]);
    },
  });

  const send = (q: string) => {
    if (!q.trim() || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    ask.mutate(q);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, ask.isPending]);

  return (
    <>
      {/* launcher bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition-transform hover:scale-105 active:scale-95"
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        <Icon name={open ? 'x' : 'bot'} size={22} />
      </button>

      {/* panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[30rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-pop">
          {/* header */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-brand-600 px-4 py-3 text-white">
            <Icon name="bot" size={18} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Roomora assistant</p>
              <p className="text-2xs text-brand-100">Answers from your live data</p>
            </div>
            <button
              className="ml-auto rounded p-1 hover:bg-white/15"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="px-1 text-xs text-ink-500">
                  Ask about your properties, tenants and rent — or try:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-ink-700'
                  }`}
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && m.source && (
                  <div className="mt-1">
                    <AiSourceTag source={m.source} />
                  </div>
                )}
              </div>
            ))}
            {ask.isPending && (
              <div className="flex items-center gap-2 px-1 text-xs text-ink-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
                Thinking…
              </div>
            )}
            {ask.error && <ErrorBanner message={apiErrorMessage(ask.error)} />}
          </div>

          {/* input */}
          <form
            className="flex items-center gap-2 border-t border-slate-200 p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="input h-9"
              placeholder="Type a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              disabled={ask.isPending || !input.trim()}
              aria-label="Send"
            >
              <Icon name="send" size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
