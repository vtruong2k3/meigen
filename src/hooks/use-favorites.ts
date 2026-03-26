"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FavoriteItem, TrendingPrompt } from "@/types";
import { trendingPrompts } from "@/lib/mock-data";

export function useFavorites() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  const { data: favorites = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((f: { promptId: string; addedAt: string }) => ({
        promptId: f.promptId,
        addedAt: new Date(f.addedAt).getTime(),
      }));
    },
    enabled: isLoggedIn,
  });

  const addMutation = useMutation({
    mutationFn: async (promptId: string) => {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (promptId: string) => {
      await fetch(`/api/favorites?promptId=${promptId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const addFavorite = useCallback(
    (promptId: string) => { if (isLoggedIn) addMutation.mutate(promptId); },
    [isLoggedIn, addMutation]
  );

  const removeFavorite = useCallback(
    (promptId: string) => { if (isLoggedIn) removeMutation.mutate(promptId); },
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

  const favoritePrompts: TrendingPrompt[] = favorites
    .map((f) => trendingPrompts.find((p) => p.id === f.promptId))
    .filter((p): p is TrendingPrompt => p !== undefined);

  return {
    favorites,
    favoritePrompts,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    count: favorites.length,
  };
}
