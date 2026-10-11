import { afterEach, expect, it, vi } from 'vitest';
import { AiClient } from './aiClient';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('reports unavailable analysis after a stalled request instead of inventing a successful insight', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new Error('Request aborted')));
  })));
  const result = new AiClient().insights({ metrics: {} });
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await result).toMatchObject({ available: false, insights: [], risks: [], opportunities: [] });
});

it.each(['NVIDIA_AI', 'RULE_BASED_FALLBACK'])('preserves usable %s analysis and its source', async (source) => {
  const reply = { source, insights: ['Two rooms are vacant.'], risks: [], opportunities: ['Review room listings.'] };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => reply }));
  expect(await new AiClient().insights({ metrics: {} })).toEqual(reply);
});
