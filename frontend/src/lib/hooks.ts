import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export function useApiQuery<T>(key: unknown[], url: string, enabled = true) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => (await api.get(url)).data,
    enabled,
  });
}

export function useApiMutation<TBody = unknown, TResp = unknown>(
  method: 'post' | 'patch' | 'delete' | 'put',
  urlFn: (body: TBody) => string,
  invalidate: unknown[][] = [],
) {
  const qc = useQueryClient();
  return useMutation<TResp, unknown, TBody>({
    mutationFn: async (body: TBody) => {
      const url = urlFn(body);
      const res = method === 'delete' ? await api.delete(url) : await api[method](url, body);
      return res.data as TResp;
    },
    onSuccess: () => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });
}
