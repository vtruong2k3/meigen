"use client";

import { useState, useEffect, useCallback } from "react";
import type { GenerationHistoryItem, GenerateTaskStatus, ImageQuality } from "@/types";

const STORAGE_KEY = "meigen_generations";
const MAX_ITEMS = 50;

function loadItems(): GenerationHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GenerationHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: GenerationHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full
  }
}

export function useGenerationHistory() {
  const [items, setItems] = useState<GenerationHistoryItem[]>([]);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  /** Add a new generation to history */
  const addGeneration = useCallback(
    (params: {
      taskId: string;
      prompt: string;
      width: number;
      height: number;
      quality: ImageQuality;
    }) => {
      const item: GenerationHistoryItem = {
        id: crypto.randomUUID(),
        taskId: params.taskId,
        prompt: params.prompt,
        imageUrl: null,
        status: "PROCESSING",
        progress: 0,
        createdAt: Date.now(),
        totalTime: null,
        width: params.width,
        height: params.height,
        quality: params.quality,
      };
      setItems((prev) => {
        const next = [item, ...prev].slice(0, MAX_ITEMS);
        saveItems(next);
        return next;
      });
      return item.id;
    },
    []
  );

  /** Update a generation's status/progress */
  const updateGeneration = useCallback(
    (
      taskId: string,
      update: {
        status?: GenerateTaskStatus;
        progress?: number;
        imageUrl?: string;
        totalTime?: number;
      }
    ) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.taskId === taskId ? { ...item, ...update } : item
        );
        saveItems(next);
        return next;
      });
    },
    []
  );

  const clearGenerations = useCallback(() => {
    setItems([]);
    saveItems([]);
  }, []);

  return {
    generations: items,
    addGeneration,
    updateGeneration,
    clearGenerations,
    count: items.length,
  };
}
