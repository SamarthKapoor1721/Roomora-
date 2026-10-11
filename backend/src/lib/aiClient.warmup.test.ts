import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AiClient } from './aiClient';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const healthy = () => Promise.resolve({ ok: true, json: async () => ({ status: 'ok', nvidiaConfigured: true }) });

it('coalesces simultaneous wake calls without waiting for AI synchronously', async () => {
  let respond!: (value: unknown) => void;
  const fetch = vi.fn(() => new Promise((resolve) => { respond = resolve; }));
  vi.stubGlobal('fetch', fetch);
  const client = new AiClient();
  const first = client.warmup();
  expect(client.warmup()).toBe(first);
  expect(client.warmupStatus).toBe('warming');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toMatch(/\/health$/);
  respond(await healthy());
  await first;
  expect(client.warmupStatus).toBe('ready');
});

it('reuses a healthy result for a minute then wakes on new activity', async () => {
  const fetch = vi.fn(healthy);
  vi.stubGlobal('fetch', fetch);
  const client = new AiClient();
  await client.warmup();
  await client.warmup();
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  await client.warmup();
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('retries an AI service still starting and becomes ready when it responds', async () => {
  const fetch = vi.fn().mockResolvedValueOnce({ ok: false }).mockImplementation(healthy);
  vi.stubGlobal('fetch', fetch);
  const client = new AiClient();
  const pending = client.warmup();
  await vi.advanceTimersByTimeAsync(5_000);
  await pending;
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(client.warmupStatus).toBe('ready');
});

it('bounds a stalled wake attempt and permits retries on later activity', async () => {
  const fetch = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  vi.stubGlobal('fetch', fetch);
  const client = new AiClient();
  const pending = client.warmup();
  await vi.advanceTimersByTimeAsync(85_000);
  await pending;
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(client.warmupStatus).toBe('unavailable');
  await client.warmup();
  expect(fetch).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(15_000);
  fetch.mockImplementation(healthy as never);
  await client.warmup();
  expect(client.warmupStatus).toBe('ready');
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(vi.getTimerCount()).toBe(0);
});

it('bounds ordinary AI health checks to five seconds', async () => {
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
  })));
  const check = new AiClient().health();
  await vi.advanceTimersByTimeAsync(5_000);
  expect(await check).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
