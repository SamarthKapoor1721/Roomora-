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

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const t = tokenStore.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
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
        original.headers!.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        tokenStore.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
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
