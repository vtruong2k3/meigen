/**
 * ai.service.ts
 * Handles all AI-related API calls to NestJS Backend.
 * Endpoint base: /api/ai
 *
 * Includes:
 *  - generate()      → POST /api/ai/generate  (multipart/form-data)
 *  - streamTask()    → SSE  /api/ai/generate/:taskId/stream
 *  - enhance()       → POST /api/ai/enhance
 *  - describe()      → POST /api/ai/describe
 *  - analyzeProduct()→ POST /api/ai/analyze-product
 *  - extractFields() → POST /api/ai/extract-fields
 */

import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Params sent to POST /api/ai/generate */
export interface GeneratePayload {
  prompt: string;
  model: string;
  width: number;
  height: number;
  quality: string;
  orientation: string;
  face_mode?: boolean;
  ref_image_url?: string;
  /** Style/composition reference image (field name: "image") */
  styleFile?: File;
  /** Face reference image (field name: "image_2") */
  faceFile?: File;
}

/** Response from Seedream sync route (images immediately available) */
export interface SeedreamResult {
  data: Array<{ url: string; b64_json?: string | null }>;
  created?: number;
}

/** Response from ChainHub async route (only task_id returned) */
export interface ChainHubTaskResult {
  task_id: string;
  status: string;
  progress?: number;
}

export type GenerateResult = SeedreamResult | ChainHubTaskResult;

/** SSE event payload streamed from /api/ai/generate/:taskId/stream */
export interface TaskStreamEvent {
  task_id: string;
  status: "PENDING" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "POLLING_ERROR" | "DONE" | "ERROR";
  progress: number;
  result?: { data: Array<{ url: string }> };
  error?: string;
  total_time?: number;
}

/** Payload for POST /api/ai/enhance */
export interface EnhancePayload {
  prompt: string;
}

/** Styles returned by /api/ai/enhance */
export interface EnhanceResult {
  cinematic: string;
  artistic: string;
  commercial: string;
}

/** Payload for POST /api/ai/describe */
export interface DescribePayload {
  imageUrl: string;
}

/** Payload for POST /api/ai/analyze-product */
export interface AnalyzeProductPayload {
  imageUrl?: string;
  templatePrompt?: string;
  manualFields?: Record<string, string>;
}

/** Payload for POST /api/ai/extract-fields */
export interface ExtractFieldsPayload {
  templatePrompt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get Bearer token from NextAuth session */
async function getAuthHeader(): Promise<HeadersInit> {
  const session = await getSession();
  const token = session?.user?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate
 * Sends multipart/form-data to NestJS Backend.
 * Returns either a Seedream sync result (with images) or a ChainHub task_id.
 */
export async function generateImage(payload: GeneratePayload): Promise<GenerateResult> {
  const authHeaders = await getAuthHeader();

  const formData = new FormData();
  formData.append("prompt", payload.prompt);
  formData.append("model", payload.model);
  formData.append("width", payload.width.toString());
  formData.append("height", payload.height.toString());
  formData.append("quality", payload.quality);
  formData.append("orientation", payload.orientation);

  if (payload.face_mode) formData.append("face_mode", "true");
  if (payload.ref_image_url) formData.append("ref_image_url", payload.ref_image_url);
  if (payload.styleFile) formData.append("image", payload.styleFile, payload.styleFile.name);
  if (payload.faceFile) formData.append("image_2", payload.faceFile, payload.faceFile.name);

  const res = await fetch(`${API_URL}/api/ai/generate`, {
    method: "POST",
    headers: authHeaders, // Do NOT set Content-Type — let browser set boundary for FormData
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Generate failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

/**
 * SSE stream: GET /api/ai/generate/:taskId/stream
 * Returns an EventSource that emits TaskStreamEvent messages.
 * The stream auto-closes on COMPLETED | FAILED | DONE | ERROR.
 *
 * Usage:
 *   const es = streamTask(taskId, (event) => { ... }, (err) => { ... });
 *   // cleanup:
 *   es.close();
 */
export function streamTask(
  taskId: string,
  onMessage: (event: TaskStreamEvent) => void,
  onError?: (err: Error) => void
): { close: () => void; readyState?: number } {
  let isClosed = false;
  const abortController = new AbortController();

  const run = async () => {
    try {
      const authHeaders = await getAuthHeader();
      const url = `${API_URL}/api/ai/generate/${taskId}/stream`;
      
      const res = await fetch(url, {
        method: "GET",
        headers: { ...authHeaders, "Accept": "text/event-stream" },
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Stream connection failed: ${res.status} ${res.statusText}`);
      }

      const body = res.body;
      if (!body) throw new Error("No response body in stream");

      const reader = body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!isClosed) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse complete SSE lines separated by double newlines (\n\n)
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 2);

          if (chunk.startsWith("data: ")) {
            const dataStr = chunk.slice(6);
            if (dataStr === "[DONE]") {
              isClosed = true;
              break;
            }
            try {
              const parsed = JSON.parse(dataStr) as TaskStreamEvent;
              onMessage(parsed);
            } catch (err) {
              console.warn("[ai.service] Failed to parse SSE event chunk:", dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (!isClosed && err.name !== "AbortError") {
        console.error("[ai.service] SSE stream error:", err);
        if (onError) onError(err);
      }
    }
  };

  run();

  return {
    close: () => {
      isClosed = true;
      abortController.abort();
    },
    // Mock readyState=2 (CLOSED) so useGenerate knows it was closed 
    get readyState() {
      return isClosed ? 2 : 1;
    }
  };
}

/**
 * POST /api/ai/enhance
 * Enhances a simple prompt into 3 styled variants using GPT-4o.
 */
export async function enhance(prompt: string): Promise<EnhanceResult> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(`${API_URL}/api/ai/enhance`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prompt } satisfies EnhancePayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Enhance failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

/**
 * POST /api/ai/describe
 * Reverse-engineers an image URL into a detailed prompt (Vision AI).
 */
export async function describe(imageUrl: string): Promise<string> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(`${API_URL}/api/ai/describe`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ imageUrl } satisfies DescribePayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Describe failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.data?.prompt ?? json?.prompt ?? "";
}

/**
 * POST /api/ai/analyze-product
 * Analyze product image and optionally adapt a template prompt.
 */
export async function analyzeProduct(
  payload: AnalyzeProductPayload
): Promise<unknown> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(`${API_URL}/api/ai/analyze-product`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Analyze product failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}

/**
 * POST /api/ai/extract-fields
 * Extract editable fields from a template prompt.
 */
export async function extractFields(
  templatePrompt: string
): Promise<unknown> {
  const authHeaders = await getAuthHeader();

  const res = await fetch(`${API_URL}/api/ai/extract-fields`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ templatePrompt } satisfies ExtractFieldsPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? `Extract fields failed: ${res.status}`);
  }

  const json = await res.json();
  return json?.data ?? json;
}
