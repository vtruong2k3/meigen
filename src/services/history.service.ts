/**
 * history.service.ts
 * Handles View History API calls to NestJS Backend.
 * Endpoint base: /api/history
 * All endpoints require Bearer token.
 */

import { fetchApi } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw history item returned from BE */
export interface HistoryItemBE {
  promptId: string;
  viewedAt: string; // ISO date string
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * GET /api/history
 * Returns view history (max 100 items) for the current user.
 */
export async function getHistory(): Promise<HistoryItemBE[]> {
  const res = await fetchApi("/api/history");
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
  const json = await res.json();
  return json?.data ?? json ?? [];
}

/**
 * POST /api/history
 * Track a prompt view (upsert — updates viewedAt if already in history).
 */
export async function addHistory(promptId: string): Promise<void> {
  const res = await fetchApi("/api/history", {
    method: "POST",
    body: JSON.stringify({ promptId }),
  });
  if (!res.ok) throw new Error(`Failed to add history: ${res.status}`);
}

/**
 * DELETE /api/history
 * Clear ALL view history for the current user.
 */
export async function clearHistory(): Promise<void> {
  const res = await fetchApi("/api/history", { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear history: ${res.status}`);
}
