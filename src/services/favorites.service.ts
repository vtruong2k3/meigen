/**
 * favorites.service.ts
 * Handles Favorites API calls to NestJS Backend.
 * Endpoint base: /api/favorites
 * All endpoints require Bearer token.
 */

import { fetchApi } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw favorite item returned from BE */
export interface FavoriteItemBE {
  promptId: string;
  addedAt: string; // ISO date string
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * GET /api/favorites
 * Returns all favorite prompts for the current user.
 */
export async function getFavorites(): Promise<FavoriteItemBE[]> {
  const res = await fetchApi("/api/favorites");
  if (!res.ok) throw new Error(`Failed to fetch favorites: ${res.status}`);
  const json = await res.json();
  // NestJS TransformInterceptor: { data: [...] }
  return json?.data ?? json ?? [];
}

/**
 * POST /api/favorites
 * Add a prompt to favorites (upsert — safe to call even if already favorited).
 */
export async function addFavorite(promptId: string): Promise<void> {
  const res = await fetchApi("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ promptId }),
  });
  if (!res.ok) throw new Error(`Failed to add favorite: ${res.status}`);
}

/**
 * DELETE /api/favorites?promptId=xxx
 * Remove a specific prompt from favorites.
 */
export async function removeFavorite(promptId: string): Promise<void> {
  const res = await fetchApi(`/api/favorites?promptId=${encodeURIComponent(promptId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to remove favorite: ${res.status}`);
}
