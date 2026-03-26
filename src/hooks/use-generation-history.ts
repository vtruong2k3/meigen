"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GenerationHistoryItem, GenerateTaskStatus, ImageQuality } from "@/types";

export function useGenerationHistory() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  const { data: generations = [] } = useQuery<GenerationHistoryItem[]>({
    queryKey: ["generations"],
    queryFn: async () => {
      const res = await fetch("/api/generations");
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((g: Record<string, unknown>) => ({
        id: g.id as string,
        taskId: g.taskId as string,
        prompt: g.prompt as string,
        imageUrl: (g.imageUrl as string) || null,
        status: g.status as GenerateTaskStatus,
        progress: g.progress as number,
        createdAt: new Date(g.createdAt as string).getTime(),
        totalTime: (g.totalTime as number) || null,
        width: g.width as number,
        height: g.height as number,
        quality: g.quality as ImageQuality,
        error: (g.error as string) || null,
      }));
    },
    enabled: isLoggedIn,
  });

  const addMutation = useMutation({
    mutationFn: async (params: {
      taskId: string;
      prompt: string;
      width: number;
      height: number;
      quality: ImageQuality;
    }) => {
      const res = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {
      taskId: string;
      status?: GenerateTaskStatus;
      progress?: number;
      imageUrl?: string;
      totalTime?: number;
      error?: string;
    }) => {
      await fetch("/api/generations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/generations", { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  const addGeneration = useCallback(
    (params: {
      taskId: string;
      prompt: string;
      width: number;
      height: number;
      quality: ImageQuality;
    }) => {
      if (!isLoggedIn) return params.taskId;
      addMutation.mutate(params);
      return params.taskId;
    },
    [isLoggedIn, addMutation]
  );

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
      if (isLoggedIn) updateMutation.mutate({ taskId, ...update });
    },
    [isLoggedIn, updateMutation]
  );

  const clearGenerations = useCallback(() => {
    if (isLoggedIn) clearMutation.mutate();
  }, [isLoggedIn, clearMutation]);

  return {
    generations,
    addGeneration,
    updateGeneration,
    clearGenerations,
    count: generations.length,
  };
}
