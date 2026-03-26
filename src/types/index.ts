/** A single trending prompt entry from meigen.ai */
export interface TrendingPrompt {
  /** Rank position in the trending list */
  rank: number;
  /** Unique tweet/post ID */
  id: string;
  /** The AI prompt text (can be plain text or JSON string) */
  prompt: string;
  /** Author's Twitter/X handle (username) */
  author: string;
  /** Author's display name */
  author_name: string;
  /** Number of likes/hearts */
  likes: number;
  /** Number of views */
  views: number;
  /** Primary image URL (first image) */
  image: string;
  /** Array of all image URLs for this prompt */
  images: string[];
  /** AI model used */
  model: AIModel;
  /** Category tags */
  categories: PromptCategory[];
  /** Date published (YYYY-MM-DD format) */
  date: string;
  /** Original source URL on X/Twitter */
  source_url: string;
}

/** Supported AI models */
export type AIModel = "nanobanana" | "gptimage" | "midjourney";

/** Prompt category tags */
export type PromptCategory =
  | "JSON"
  | "Photograph"
  | "Girl"
  | "Product"
  | "3D"
  | "Food"
  | "Other"
  | "App";

/** Model filter tab */
export interface ModelTab {
  id: string;
  label: string;
  /** Maps to TrendingPrompt.model value(s) */
  modelValue?: AIModel;
}

/** Sort option */
export type SortOption = "featured" | "newest" | "popular";

export interface SortTab {
  id: SortOption;
  label: string;
}

/** Category filter item for sidebar */
export interface CategoryItem {
  id: string;
  label: string;
  /** Maps to TrendingPrompt.categories value */
  categoryValue?: PromptCategory;
}

/** Application view/page */
export type AppView = "home" | "history" | "favorites";

/** Generate panel mode */
export type GenerateMode = "prompt" | "ref";

/** Image aspect ratio options */
export type AspectRatio = "1:1" | "3:4" | "4:5" | "2:3" | "9:16" | "4:3" | "5:4" | "3:2" | "16:9" | "21:9";

/** Image resolution options */
export type Resolution = "sd" | "hd";

/** Theme mode */
export type ThemeMode = "light" | "dark" | "system";

/** Favorite item stored in localStorage */
export interface FavoriteItem {
  /** Prompt ID */
  promptId: string;
  /** Timestamp when added */
  addedAt: number;
}

/** History item stored in localStorage */
export interface HistoryItem {
  /** Prompt ID */
  promptId: string;
  /** Timestamp when viewed */
  viewedAt: number;
}

/** Search tab */
export type SearchTab = "Posts" | "Generations";

/* ── ChainHub Generation API ──────────────────────── */

/** Image quality */
export type ImageQuality = "sd" | "hd";

/** Image orientation */
export type ImageOrientation = "portrait" | "landscape";

/** Predefined size preset */
export interface ImageSizePreset {
  label: string;
  width: number;
  height: number;
}

/** Available size presets */
export const IMAGE_SIZE_PRESETS: ImageSizePreset[] = [
  { label: "1024 × 1536 (Portrait)", width: 1024, height: 1536 },
  { label: "1536 × 1024 (Landscape)", width: 1536, height: 1024 },
  { label: "1024 × 1024 (Square)", width: 1024, height: 1024 },
  { label: "768 × 1152", width: 768, height: 1152 },
  { label: "1152 × 768", width: 1152, height: 768 },
];

/** Task status from ChainHub API */
export type GenerateTaskStatus =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

/** ChainHub task response (legacy polling) */
export interface GenerateTaskResponse {
  task_id: string;
  status: GenerateTaskStatus;
  progress?: number;
  result: {
    data: Array<{ url: string; b64_json: string | null }>;
    created: number;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  } | null;
  error: string | null;
  total_time: number | null;
}

/** Seedream synchronous response */
export interface SeedreamResponse {
  data: Array<{ url: string; b64_json?: string | null }>;
  created?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Parameters for submitting a generation */
export interface GenerateParams {
  prompt: string;
  model: string;
  width: number;
  height: number;
  quality: ImageQuality;
  orientation: ImageOrientation;
  image?: File;
  image_2?: File;
  /** Gallery image URL used as face reference (sent to backend to avoid CORS) */
  ref_image_url?: string;
  /** When true, backend injects Chinese face-lock instruction into prompt */
  faceMode?: boolean;
}

/** A generation record stored in history */
export interface GenerationHistoryItem {
  id: string;
  taskId: string;
  prompt: string;
  imageUrl: string | null;
  status: GenerateTaskStatus;
  progress: number;
  createdAt: number;
  totalTime: number | null;
  width: number;
  height: number;
  quality: ImageQuality;
  error?: string | null;
}

/* ── Food & Drink AI — Product Analysis ────────── */

/** Result from /api/analyze-product vision analysis */
export interface ProductAnalysis {
  /** Product/dish name */
  name: string;
  /** Category for template matching */
  category: "dish" | "beverage" | "dessert" | "snack" | "packaged";
  /** Cuisine or origin (e.g. "Vietnamese", "Japanese") */
  cuisine?: string;
  /** Key ingredients or components */
  ingredients: string[];
  /** Dominant colors */
  colors: string[];
  /** Brand name (if packaged product) */
  brand?: string;
  /** Short description */
  description?: string;
}

/** Editable field extracted from a template prompt by AI */
export interface TemplateField {
  /** Machine key, e.g. "dish_name", "ingredients" */
  field: string;
  /** Human-readable label, e.g. "Dish Name" */
  label: string;
  /** Current value from the template */
  value: string;
  /** Input type hint */
  type: "text" | "list" | "color";
  /** Placeholder hint */
  placeholder?: string;
}

