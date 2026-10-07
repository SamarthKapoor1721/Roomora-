import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'srms.accessToken';
const REFRESH_KEY = 'srms.refreshToken';

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '');

/** Local Vite proxy in development; an explicit API origin in production. */
export const api = axios.create({ baseURL: `${apiOrigin}/api/v1`, timeout: 20_000 });

export function assetUrl(relativeUrl: string): string {
  return `${apiOrigin}${relativeUrl}`;
}

/** Fetch private uploads with the access token instead of exposing a public URL. */
export async function openPrivateFile(path: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const response = await api.get(`/files/${path}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = path.split('/').pop() ?? 'attachment';
      link.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    window.alert(apiErrorMessage(error));
  }
}

api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing: Promise<string> | null = null;

/** Endpoints that must never trigger the refresh-and-retry dance. */
function isAuthRoute(url?: string) {
  return !!url && /\/auth\/(login|register|refresh|logout)/.test(url);
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    const canRetry =
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRoute(original.url) &&
      !!tokenStore.refresh;

    if (!canRetry) return Promise.reject(error);

    original!._retry = true;
    try {
      refreshing ??= api
        .post('/auth/refresh', { refreshToken: tokenStore.refresh })
        .then((res) => {
          const { accessToken, refreshToken } = res.data.data;
          tokenStore.set(accessToken, refreshToken);
          return accessToken as string;
        })
        .finally(() => {
          refreshing = null;
        });
      const newToken = await refreshing;
      original!.headers!.Authorization = `Bearer ${newToken}`;
      return api(original!);
    } catch {
      // Refresh failed: the session is dead. Clear it and reject so callers
      // (e.g. AuthProvider) settle immediately; route guards send the user to
      // /login. Do NOT touch window.location here: navigating from inside a
      // rejected promise can strand pending microtasks and hang the app.
      tokenStore.clear();
      return Promise.reject(error);
    }
  },
);

export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED') return 'Roomora is taking too long to respond. Please try again shortly.';
    if (err.code === 'ERR_NETWORK') return 'Cannot connect to Roomora right now. Please try again shortly.';
    const data = err.response?.data as { error?: { message?: string; details?: unknown } } | undefined;
    if (data?.error?.message) {
      const details = data.error.details;
      if (Array.isArray(details) && details.length) {
        return `${data.error.message}: ${details.map((d: { message?: string }) => d.message ?? JSON.stringify(d)).join(', ')}`;
      }
      return data.error.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
