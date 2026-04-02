"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HistoryItem } from "@/types";
import type { TrendingPromptBE } from "@/services/trending.service";
import * as historyService from "@/services/history.service";
import { getTrendingBulk } from "@/services/trending.service";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHistory() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  // ── Step 1: Fetch raw viewed IDs from backend ────────────────────────────────
  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => {
      const items = await historyService.getHistory();
      return items.map((h) => ({
        promptId: h.promptId,
        viewedAt: new Date(h.viewedAt).getTime(),
      }));
    },
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  // ── Step 2: Hydrate — bulk-fetch full prompt objects for the collected IDs ───
  // Preserves the most-recently-viewed order returned by the backend (desc).
  const rawIds = history.map((h) => h.promptId);

  const { data: historyPrompts = [], isLoading: isLoadingPrompts } =
    useQuery<TrendingPromptBE[]>({
      queryKey: ["history-prompts", rawIds],
      queryFn: () => getTrendingBulk(rawIds),
      enabled: isLoggedIn && rawIds.length > 0,
      staleTime: 60_000,
    });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (promptId: string) => historyService.addHistory(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => historyService.clearHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  // ── Actions ──────────────────────────────────────────────────────────────────

  const addToHistory = useCallback(
    (promptId: string) => {
      if (isLoggedIn) addMutation.mutate(promptId);
    },
    [isLoggedIn, addMutation]
  );

  const clearHistory = useCallback(() => {
    if (isLoggedIn) clearMutation.mutate();
  }, [isLoggedIn, clearMutation]);

  return {
    /** Raw ID + timestamp list */
    history,
    /** Full prompt objects hydrated from /api/trending/bulk */
    historyPrompts,
    /** True while hydrated prompts are being fetched */
    isLoadingPrompts,
    addToHistory,
    clearHistory,
    count: history.length,
  };
}
