/**
 * generations.service.ts
 * Handles Generation History API calls to NestJS Backend.
 * Endpoint base: /api/generations
 * All endpoints require Bearer token.
 */

import { fetchApi } from "@/lib/api-client";
import type { GenerateTaskStatus, ImageQuality } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw generation record returned from Backend */
export interface GenerationItemBE {
  id: string;
  taskId: string;
  prompt: string;
  imageUrl: string | null;
  status: GenerateTaskStatus;
  progress: number;
  createdAt: string; // ISO date string
  totalTime: number | null;
  width: number;
  height: number;
  quality: ImageQuality;
  error: string | null;
}

export interface CreateGenerationPayload {
  taskId: string;
  prompt: string;
  width: number;
  height: number;
  quality: ImageQuality;
}

export interface UpdateGenerationPayload {
  taskId: string;
  status?: GenerateTaskStatus;
  progress?: number;
  imageUrl?: string;
  totalTime?: number;
  error?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * GET /api/generations
 * Returns generation history (max 50 items) for the current user.
 */
export async function getGenerations(): Promise<GenerationItemBE[]> {
  const res = await fetchApi("/api/generations");
  if (!res.ok) throw new Error(`Failed to fetch generations: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json ?? [];
}

/**
 * POST /api/generations
 * Create a new generation record (called when generation starts).
 */
export async function createGeneration(
  payload: CreateGenerationPayload
): Promise<GenerationItemBE> {
  const res = await fetchApi("/api/generations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create generation: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json;
}

/**
 * PATCH /api/generations
 * Update generation status/progress/imageUrl (partial update by taskId).
 */
export async function updateGeneration(
  payload: UpdateGenerationPayload
): Promise<void> {
  const res = await fetchApi("/api/generations", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update generation: ${res.status}`);
}

/**
 * DELETE /api/generations
 * Clear ALL generation history for the current user.
 */
export async function clearGenerations(): Promise<void> {
  const res = await fetchApi("/api/generations", { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear generations: ${res.status}`);
}
