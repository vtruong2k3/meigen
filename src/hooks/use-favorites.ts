"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FavoriteItem } from "@/types";
import type { TrendingPromptBE } from "@/services/trending.service";
import * as favoritesService from "@/services/favorites.service";
import { getTrendingBulk } from "@/services/trending.service";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFavorites() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  // ── Step 1: Fetch raw favorite IDs from backend ─────────────────────────────
  const { data: favorites = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const items = await favoritesService.getFavorites();
      return items.map((f) => ({
        promptId: f.promptId,
        addedAt: new Date(f.addedAt).getTime(),
      }));
    },
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  // ── Step 2: Hydrate — bulk-fetch full prompt objects for the collected IDs ───
  // Only runs when we actually have IDs to look up.
  const rawIds = favorites.map((f) => f.promptId);

  const { data: favoritePrompts = [], isLoading: isLoadingPrompts } =
    useQuery<TrendingPromptBE[]>({
      queryKey: ["favorites-prompts", rawIds],
      queryFn: () => getTrendingBulk(rawIds),
      // Skip network call entirely if there are no IDs yet
      enabled: isLoggedIn && rawIds.length > 0,
      staleTime: 60_000, // Prompt detail rarely changes — cache for 1 min
    });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (promptId: string) => favoritesService.addFavorite(promptId),
    onSuccess: () => {
      // Invalidate both layers: raw IDs list and the hydrated prompts
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (promptId: string) => favoritesService.removeFavorite(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  // ── Actions ──────────────────────────────────────────────────────────────────

  const addFavorite = useCallback(
    (promptId: string) => {
      if (isLoggedIn) addMutation.mutate(promptId);
    },
    [isLoggedIn, addMutation]
  );

  const removeFavorite = useCallback(
    (promptId: string) => {
      if (isLoggedIn) removeMutation.mutate(promptId);
    },
    [isLoggedIn, removeMutation]
  );

  const toggleFavorite = useCallback(
    (promptId: string) => {
      const exists = favorites.some((f) => f.promptId === promptId);
      if (exists) removeFavorite(promptId);
      else addFavorite(promptId);
    },
    [favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (promptId: string) => favorites.some((f) => f.promptId === promptId),
    [favorites]
  );

  return {
    /** Raw ID + timestamp list (for isFavorite checks) */
    favorites,
    /** Full prompt objects hydrated from /api/trending/bulk */
    favoritePrompts,
    /** True while hydrated prompts are being fetched */
    isLoadingPrompts,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    count: favorites.length,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
