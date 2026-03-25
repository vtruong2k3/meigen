import type { AspectRatio } from "@/types";

/* ── Model Configuration ──────────────────────────
 * Central source of truth for all AI models.
 * Edit this file to add/remove models — changes
 * propagate to GeneratePanel, API route, and hooks.
 * ───────────────────────────────────────────────── */

/** All available aspect ratios */
export const ALL_ASPECT_RATIOS: AspectRatio[] = [
  "1:1", "3:4", "4:5", "2:3", "9:16", "4:3", "5:4", "3:2", "16:9", "21:9",
];

/**
 * Map aspect ratio → pixel dimensions for the API.
 * All sizes are:
 *  - Exact mathematical ratios (w/h = ratio)
 *  - Multiples of 8 (required by diffusion models)
 *  - Portrait ↔ Landscape are symmetric rotations
 *
 *  Ratio    Size         Pixels   Notes
 *  ─────    ──────────   ──────   ─────
 *  1:1      1024×1024    1.05M    Standard square
 *  3:4      768×1024     0.79M    ↔ 4:3
 *  4:5      1024×1280    1.31M    ↔ 5:4
 *  2:3      1024×1536    1.57M    ↔ 3:2, Sora compatible
 *  9:16     864×1536     1.33M    ↔ 16:9
 *  4:3      1024×768     0.79M    ↔ 3:4
 *  5:4      1280×1024    1.31M    ↔ 4:5
 *  3:2      1536×1024    1.57M    ↔ 2:3, Sora compatible
 *  16:9     1536×864     1.33M    ↔ 9:16
 *  21:9     1680×720     1.21M    Ultrawide
 */
export const ASPECT_TO_SIZE: Record<AspectRatio, { width: number; height: number }> = {
  "1:1":  { width: 1024, height: 1024 },
  "3:4":  { width: 768,  height: 1024 },
  "4:5":  { width: 1024, height: 1280 },
  "2:3":  { width: 1024, height: 1536 },
  "9:16": { width: 864,  height: 1536 },
  "4:3":  { width: 1024, height: 768  },
  "5:4":  { width: 1280, height: 1024 },
  "3:2":  { width: 1536, height: 1024 },
  "16:9": { width: 1536, height: 864  },
  "21:9": { width: 1680, height: 720  },
};

/** Get pixel dimensions for a model + aspect ratio */
export function getSizeForModel(apiName: string, ratio: AspectRatio): { width: number; height: number } {
  return ASPECT_TO_SIZE[ratio];
}

/* ── Model Definition ─────────────────────────── */

export interface ModelConfig {
  /** Unique identifier */
  id: string;
  /** Display name in the UI */
  label: string;
  /** API model name sent to the backend */
  apiName: string;
  /** UI icon style */
  icon: "seedream" | "seededit" | "chainhub" | "sora";
  /** Badge color class */
  color: string;
  /** Short description */
  description: string;
  /** Supported generation types */
  types: ("t2i" | "i2i")[];
  /** Which aspect ratios this model supports */
  supportedRatios: AspectRatio[];
  /** API type: "seedream" (sync JSON) or "legacy" (async FormData + polling) */
  apiType: "seedream" | "legacy";
  /** Seedream version family: "v5" (5.0/4.5/4.0) or "v3" (3.0) */
  seedreamVersion?: "v5" | "v3";
}

/** All available models */
export const MODELS: ModelConfig[] = [
  {
    id: "chainhub",
    label: "ChainHub",
    apiName: "chainhub",
    icon: "chainhub",
    color: "bg-cyan-500",
    description: "Your API key",
    types: ["t2i", "i2i"],
    supportedRatios: ALL_ASPECT_RATIOS,
    apiType: "legacy",
  },
  {
    id: "seedream-5",
    label: "Seedream 5.0",
    apiName: "doubao-seedream-5-0-260128",
    icon: "seedream",
    color: "bg-emerald-500",
    description: "Highest quality",
    types: ["t2i", "i2i"],
    supportedRatios: ALL_ASPECT_RATIOS,
    apiType: "seedream",
    seedreamVersion: "v5",
  },
  {
    id: "seedream-4.5",
    label: "Seedream 4.5",
    apiName: "doubao-seedream-4-5-251128",
    icon: "seedream",
    color: "bg-blue-500",
    description: "Balanced quality",
    types: ["t2i", "i2i"],
    supportedRatios: ALL_ASPECT_RATIOS,
    apiType: "seedream",
    seedreamVersion: "v5",
  },
  {
    id: "seedream-4",
    label: "Seedream 4.0",
    apiName: "doubao-seedream-4-0-250828",
    icon: "seedream",
    color: "bg-purple-500",
    description: "Fast generation",
    types: ["t2i", "i2i"],
    supportedRatios: ALL_ASPECT_RATIOS,
    apiType: "seedream",
    seedreamVersion: "v5",
  },
  {
    id: "seedream-3",
    label: "Seedream 3.0",
    apiName: "doubao-seedream-3-0-t2i-250415",
    icon: "seedream",
    color: "bg-orange-500",
    description: "Text to image",
    types: ["t2i"],
    supportedRatios: ["1:1", "2:3", "3:2"],
    apiType: "seedream",
    seedreamVersion: "v3",
  },
  {
    id: "sora-image",
    label: "Sora Image",
    apiName: "sora_image",
    icon: "sora",
    color: "bg-rose-500",
    description: "T2I & I2I (3 sizes)",
    types: ["t2i", "i2i"],
    supportedRatios: ["1:1", "2:3", "3:2"] as AspectRatio[],
    apiType: "seedream",
  },
];

/* ── Derived helpers ──────────────────────────── */

/** All Seedream model API names (use synchronous API) */
export const SEEDREAM_MODEL_NAMES = MODELS
  .filter((m) => m.apiType === "seedream")
  .map((m) => m.apiName);

/** Seedream V3 model API names (use guidance_scale, seed, fixed sizes) */
export const SEEDREAM_V3_MODEL_NAMES = MODELS
  .filter((m) => m.seedreamVersion === "v3")
  .map((m) => m.apiName);

/** Check if a model name is a Seedream model */
export function isSeedreamModel(apiName: string): boolean {
  return SEEDREAM_MODEL_NAMES.includes(apiName);
}

/** Check if a model name is a Seedream V3 model */
export function isSeedreamV3Model(apiName: string): boolean {
  return SEEDREAM_V3_MODEL_NAMES.includes(apiName);
}

/** Get model config by API name */
export function getModelByApiName(apiName: string): ModelConfig | undefined {
  return MODELS.find((m) => m.apiName === apiName);
}


/** Models that use the new Seedream JSON API */
export const SEEDREAM_MODELS = [
  "doubao-seedream-5-0-260128", 
  "doubao-seedream-4-5-251128",
  "doubao-seedream-4-0-250828",
  "doubao-seedream-3-0-t2i-250415",
  "doubao-seededit-3-0-i2i-250628",
];

/** Models that use the legacy Seedream 3.x param style (guidance_scale, seed) */
export const SEEDREAM_V3_MODELS = [
  "doubao-seedream-3-0-t2i-250415",
  "doubao-seededit-3-0-i2i-250628",
];