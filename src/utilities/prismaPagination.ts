export type OffsetPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type OffsetPage<T> = {
  items: T[];
  pagination: OffsetPaginationMeta;
};

export function toOffsetPaginationMeta(page: number, limit: number, total: number): OffsetPaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages
  };
}

export function toOffsetSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
