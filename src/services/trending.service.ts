/**
 * trending.service.ts
 * Handles Trending Prompts API calls to NestJS Backend.
 * Endpoint base: /api/trending
 *
 * Public endpoints: GET /api/trending, /api/trending/meta
 * Auth-optional:   POST /api/trending/bulk (requires Bearer for rate-limit bypass)
 */

import { fetchApi } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Sort options supported by GET /api/trending */
export type TrendingSortBy = "likes" | "views" | "rank" | "date";
export type TrendingOrder = "asc" | "desc";

/** Query params for GET /api/trending */
export interface TrendingQuery {
  page?: number;
  limit?: number;
  category?: string;
  model?: string;
  search?: string;
  sortBy?: TrendingSortBy;
  order?: TrendingOrder;
}

/** A trending prompt item from the Backend DB */
export interface TrendingPromptBE {
  id: string;
  rank: number;
  prompt: string;
  author: string;
  author_name: string;
  likes: number;
  views: number;
  image: string;
  images: string[];
  model: string;
  categories: string[];
  date: string;
  source_url?: string;
}

/** Meta info for filtering (available categories & models) */
export interface TrendingMeta {
  categories: string[];
  models: string[];
}

/** Paginated response wrapper */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * GET /api/trending
 * Returns paginated & filterable trending prompts from the community.
 */
export async function getTrending(
  query: TrendingQuery = {}
): Promise<PaginatedResult<TrendingPromptBE>> {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", query.page.toString());
  if (query.limit != null) params.set("limit", query.limit.toString());
  if (query.category) params.set("category", query.category);
  if (query.model) params.set("model", query.model);
  if (query.search) params.set("search", query.search);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.order) params.set("order", query.order);

  const url = `${API_URL}/api/trending?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 60 } }); // Cache 60s in Next.js

  if (!res.ok) throw new Error(`Failed to fetch trending: ${res.status}`);

  const json = await res.json();

  // Handle BE TransformInterceptor wrapping: { data: { data: [], total: ... } }
  const payload = json?.data ?? json;

  // If BE returns flat array (no pagination envelope yet), wrap it
  if (Array.isArray(payload)) {
    return { data: payload, total: payload.length, page: 1, limit: payload.length, totalPages: 1 };
  }

  return payload as PaginatedResult<TrendingPromptBE>;
}

/**
 * GET /api/trending/meta
 * Returns available categories and models for filtering UI.
 */
export async function getTrendingMeta(): Promise<TrendingMeta> {
  const res = await fetch(`${API_URL}/api/trending/meta`, {
    next: { revalidate: 300 }, // Cache 5 min
  });
  if (!res.ok) throw new Error(`Failed to fetch trending meta: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

/**
 * GET /api/trending/:id
 * Returns a single trending prompt by ID.
 */
export async function getTrendingById(id: string): Promise<TrendingPromptBE> {
  const res = await fetch(`${API_URL}/api/trending/${id}`);
  if (!res.ok) throw new Error(`Trending prompt not found: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

/**
 * GET /api/trending/author/:author
 * Returns prompts from a specific author.
 */
export async function getTrendingByAuthor(
  author: string,
  limit = 10
): Promise<TrendingPromptBE[]> {
  const res = await fetch(
    `${API_URL}/api/trending/author/${encodeURIComponent(author)}?limit=${limit}`
  );
  if (!res.ok) throw new Error(`Failed to fetch author's prompts: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json ?? [];
}

/**
 * POST /api/trending/bulk
 * Fetch multiple trending prompt objects by their IDs in a single round-trip.
 * Used by useHistory & useFavorites to hydrate prompt details from stored IDs.
 *
 * Payload: { ids: string[] }  (validated by BulkTrendingDto on the backend)
 * Returns: TrendingPromptBE[] (unwrapped from { data: [...] })
 *
 * Falls back to [] if the ids array is empty — skips the network call entirely.
 */
export async function getTrendingBulk(ids: string[]): Promise<TrendingPromptBE[]> {
  if (ids.length === 0) return [];

  const res = await fetchApi("/api/trending/bulk", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) throw new Error(`Failed to bulk-fetch trending prompts: ${res.status}`);

  const json = await res.json();
  // Backend wraps response via TransformInterceptor: { data: [...] }
  const payload = json?.data ?? json;
  return Array.isArray(payload) ? payload : [];
}
