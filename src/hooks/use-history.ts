"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistoryItem, TrendingPrompt } from "@/types";
import { trendingPrompts } from "@/lib/mock-data";

const STORAGE_KEY = "meigen_history";
const MAX_HISTORY = 100;

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /** Record a prompt view — moves to top if already in history */
  const addToHistory = useCallback((promptId: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.promptId !== promptId);
      const next = [{ promptId, viewedAt: Date.now() }, ...filtered].slice(
        0,
        MAX_HISTORY
      );
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  /** Resolve history IDs to full TrendingPrompt objects */
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
