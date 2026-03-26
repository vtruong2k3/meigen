"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HistoryItem, TrendingPrompt } from "@/types";
import { trendingPrompts } from "@/lib/mock-data";

export function useHistory() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  const { data: history = [] } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: async () => {
      const res = await fetch("/api/history");
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((h: { promptId: string; viewedAt: string }) => ({
        promptId: h.promptId,
        viewedAt: new Date(h.viewedAt).getTime(),
      }));
    },
    enabled: isLoggedIn,
  });

  const addMutation = useMutation({
    mutationFn: async (promptId: string) => {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/history", { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["history"] }),
  });

  const addToHistory = useCallback(
    (promptId: string) => { if (isLoggedIn) addMutation.mutate(promptId); },
    [isLoggedIn, addMutation]
  );

  const clearHistory = useCallback(() => {
    if (isLoggedIn) clearMutation.mutate();
  }, [isLoggedIn, clearMutation]);

  const historyPrompts: TrendingPrompt[] = history
    .map((h) => trendingPrompts.find((p) => p.id === h.promptId))
    .filter((p): p is TrendingPrompt => p !== undefined);

  return {
    history,
    historyPrompts,
    addToHistory,
    clearHistory,
    count: history.length,
  };
}
