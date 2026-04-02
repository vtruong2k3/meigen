"use client";

import { useQuery } from "@tanstack/react-query";
import * as trendingService from "@/services/trending.service";
import type {
  TrendingPromptBE,
  TrendingQuery,
  PaginatedResult,
} from "@/services/trending.service";

export type { TrendingPromptBE };

/**
 * useTrending
 * Fetches paginated trending prompts from NestJS Backend (/api/trending).
 * No auth needed — public endpoint.
 *
 * @param query - Filter/sort/paginate options
 */
export function useTrending(query: TrendingQuery = {}) {
  const {
    page = 1,
    limit = 40,
    category,
    model,
    search,
    sortBy,
    order,
  } = query;

  const { data, isLoading, isError, error, refetch } = useQuery<
    PaginatedResult<TrendingPromptBE>
  >({
    queryKey: ["trending", { page, limit, category, model, search, sortBy, order }],
    queryFn: () =>
      trendingService.getTrending({ page, limit, category, model, search, sortBy, order }),
    staleTime: 60_000, // 1 min cache — trending doesn't change every second
    placeholderData: (prev) => prev, // Keep previous data while loading new page
  });

  return {
    prompts: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    currentPage: data?.page ?? page,
    isLoading,
    isError,
    error,
    refetch,
    isEmpty: !isLoading && (data?.data?.length ?? 0) === 0,
  };
}

/**
 * useTrendingMeta
 * Returns available categories and models for filter dropdowns.
 * Cached for 5 minutes.
 */
export function useTrendingMeta() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-meta"],
    queryFn: () => trendingService.getTrendingMeta(),
    staleTime: 300_000, // 5 min
  });

  return {
    categories: data?.categories ?? [],
    models: data?.models ?? [],
    isLoading,
  };
}
