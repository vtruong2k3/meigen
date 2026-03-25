"use client";

import { useState, useEffect, useCallback } from "react";
import type { FavoriteItem, TrendingPrompt } from "@/types";
import { trendingPrompts } from "@/lib/mock-data";

const STORAGE_KEY = "meigen_favorites";

function loadFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const addFavorite = useCallback((promptId: string) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.promptId === promptId)) return prev;
      const next = [{ promptId, addedAt: Date.now() }, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((promptId: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.promptId !== promptId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((promptId: string) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.promptId === promptId);
      const next = exists
        ? prev.filter((f) => f.promptId !== promptId)
        : [{ promptId, addedAt: Date.now() }, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (promptId: string) => favorites.some((f) => f.promptId === promptId),
    [favorites]
  );

  /** Resolve favorite IDs to full TrendingPrompt objects */
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
