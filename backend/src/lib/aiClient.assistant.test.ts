import { afterEach, expect, it, vi } from 'vitest';
import { aiClient } from './aiClient';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('settles a stalled chat request after 30 seconds with a fallback', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new Error('Request aborted')));
  })));
  const request = aiClient.assistant({ question: 'Is AI working?', context: {} });
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await request).toMatchObject({ source: 'RULE_BASED_FALLBACK' });
  expect((await request).answer).toContain('could not respond');
});

it('preserves successful AI replies', async () => {
  const reply = { source: 'NVIDIA_AI', answer: 'Your portfolio has no active properties.' };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => reply }));
  expect(await aiClient.assistant({ question: 'Give me an overview', context: {} })).toEqual(reply);
});
