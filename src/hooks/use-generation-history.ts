"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GenerationHistoryItem, GenerateTaskStatus, ImageQuality } from "@/types";
import * as generationsService from "@/services/generations.service";

export function useGenerationHistory() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isLoggedIn = !!session?.user;

  // ── Fetch generations ─────────────────────────────────────────────
  const { data: generations = [] } = useQuery<GenerationHistoryItem[]>({
    queryKey: ["generations"],
    queryFn: async () => {
      const items = await generationsService.getGenerations();
      return items.map((g) => ({
        id: g.id,
        taskId: g.taskId,
        prompt: g.prompt,
        imageUrl: g.imageUrl,
        status: g.status as GenerateTaskStatus,
        progress: g.progress,
        createdAt: new Date(g.createdAt).getTime(),
        totalTime: g.totalTime,
        width: g.width,
        height: g.height,
        quality: g.quality as ImageQuality,
        error: g.error,
      }));
    },
    enabled: isLoggedIn,
    staleTime: 10_000,
  });

  // ── Mutations ─────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (params: {
      taskId: string;
      prompt: string;
      width: number;
      height: number;
      quality: ImageQuality;
    }) => generationsService.createGeneration(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  const updateMutation = useMutation({
    mutationFn: (params: {
      taskId: string;
      status?: GenerateTaskStatus;
      progress?: number;
      imageUrl?: string;
      totalTime?: number;
      error?: string;
    }) => generationsService.updateGeneration(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  const clearMutation = useMutation({
    mutationFn: () => generationsService.clearGenerations(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generations"] }),
  });

  // ── Actions ───────────────────────────────────────────────────────
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
        error?: string;
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
