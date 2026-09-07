import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../lib/api';
import { Icon } from '../../components/Icon';
import { AiSourceTag, ErrorBanner, InlineNote, PageHeader } from '../../components/ui';

interface Msg { role: 'user' | 'assistant'; content: string; source?: string }

const suggestions = [
  'Which tenants have overdue rent?',
  'Which rooms are vacant?',
  'Which leases expire this month?',
  'What is my total revenue?',
  'Which maintenance issue occurs most often?',
];

export default function OwnerAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const convo = useRef<string | undefined>(undefined);

  const ask = useMutation({
    mutationFn: async (question: string) =>
      (await api.post('/owner/assistant/ask', { question, conversationId: convo.current })).data.data,
    onSuccess: (data) => {
      convo.current = data.conversationId;
      setMessages((m) => [...m, { role: 'assistant', content: data.message.content, source: data.source }]);
    },
  });

  const send = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    ask.mutate(q);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI assistant"
        description="Ask about your properties, tenants and rent. Answers come from your live data only — it never makes records up."
      />

      {messages.length === 0 && (
        <div className="mb-4">
          <InlineNote>
            Try one of these, or type your own question below.
          </InlineNote>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="text-sm text-ink-400">Your conversation will appear here.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start'}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'border border-slate-200 bg-slate-50 text-ink-700'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'assistant' && m.source && (
              <div className="mt-1.5">
                <AiSourceTag source={m.source} />
              </div>
            )}
          </div>
        ))}
        {ask.isPending && (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
            Thinking…
          </div>
        )}
        {ask.error && <ErrorBanner message={apiErrorMessage(ask.error)} />}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input"
          placeholder="Ask about overdue rent, vacant rooms, expiring leases…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-primary" disabled={ask.isPending || !input.trim()}>
          <Icon name="send" size={16} />
          Send
        </button>
      </form>
    </div>
  );
}
