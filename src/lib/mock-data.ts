/**
 * mock-data.ts
 * FORMATTER UTILITIES — No mock data, no hardcoded categories/models.
 * These helpers are shared across the app for formatting display values.
 *
 * Categories, Models:  fetched dynamically from /api/trending/meta via useTrendingMeta()
 * SortTabs:            static const in HeaderTabs.tsx (UI-only, no backend dep)
 */

import type { AIModel } from "@/types";
import { formatDistanceToNow } from "date-fns";

/** Model display labels — used by getModelLabel() below */
const modelLabels: Record<AIModel, string> = {
  nanobanana: "Nanobanana Pro",
  gptimage: "Image 1.5",
  midjourney: "Midjourney",
};

/** Helper: get display label for a model */
export function getModelLabel(model: string): string {
  return modelLabels[model as AIModel] ?? model;
}

/** Helper: format view count  */
export function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return String(views);
}

/** Helper: format date to relative time using date-fns */
export function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/** Helper: get a short preview of the prompt text */
export function getPromptPreview(prompt: string, maxLength = 120): string {
  const trimmed = prompt.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      const readable =
        parsed.assembled_prompt ||
        parsed.full_prompt_string ||
        parsed.prompt_text ||
        parsed.prompt_structure?.subject?.demographics ||
        parsed.scene_description ||
        parsed.subject?.description ||
        trimmed.slice(0, maxLength);
      return typeof readable === "string"
        ? readable.slice(0, maxLength)
        : trimmed.slice(0, maxLength);
    } catch {
      return trimmed.slice(0, maxLength);
    }
  }
  return trimmed.slice(0, maxLength);
}
