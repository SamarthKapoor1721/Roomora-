export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePage(query: Record<string, unknown>, defaultSize = 20, maxSize = 100): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(query.pageSize) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
