"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GenerateTaskStatus, GenerateParams } from "@/types";
import { SEEDREAM_MODEL_NAMES } from "@/lib/models";
import { toast } from "sonner";
import * as aiService from "@/services/ai.service";
import type { TaskStreamEvent } from "@/services/ai.service";

// ── Image processing helpers (unchanged — pure client-side logic) ──────────────

/** Resize, crop, and compress File to exactly the target width × height as JPEG. */
async function processImageToExactSizeAndFormat(
  file: File,
  width: number,
  height: number
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, x, y, w, h);

      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], "image.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/** Compress face reference image while PRESERVING original aspect ratio. */
async function compressFaceImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else { width = Math.round((width / height) * MAX); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], "face_ref.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseGenerateReturn {
  status: GenerateTaskStatus | "IDLE";
  taskId: string | null;
  resultImages: string[];
  error: string | null;
  totalTime: number | null;
  progress: number;
  isGenerating: boolean;
  generate: (params: GenerateParams) => Promise<void>;
  reset: () => void;
}

export interface UseGenerateOptions {
  onStart?: (taskId: string, params: GenerateParams) => void;
  onProgress?: (taskId: string, progress: number) => void;
  onComplete?: (
    taskId: string,
    images: string[],
    totalTime: number | null,
    params: GenerateParams
  ) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGenerate(options?: UseGenerateOptions): UseGenerateReturn {
  const [status, setStatus] = useState<GenerateTaskStatus | "IDLE">("IDLE");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  // SSE Stream ref (custom fetch-based stream object)
  const eventSourceRef = useRef<{ close: () => void; readyState?: number } | null>(null);
  // Simulated progress interval ref (for Seedream sync wait)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paramsRef = useRef<GenerateParams | null>(null);
  const startTimeRef = useRef(0);

  // ── Cleanup helpers ───────────────────────────────────────────────

  const closeSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  /** Simulated progress animation for synchronous Seedream API wait */
  const startSimulatedProgress = useCallback(
    (fakeTaskId: string) => {
      stopProgress();
      let tick = 0;
      progressRef.current = setInterval(() => {
        tick += 1;
        const p = Math.min(95, Math.round((1 - Math.exp(-tick / 8)) * 100));
        setProgress(p);
        options?.onProgress?.(fakeTaskId, p);
      }, 1000);
    },
    [stopProgress, options]
  );

  // ── SSE stream handler (ChainHub async) ──────────────────────────

  const startSSEStream = useCallback(
    (id: string) => {
      closeSSE();

      const es = aiService.streamTask(
        id,
        (event: TaskStreamEvent) => {
          // Update status & progress from stream
          const newStatus = event.status as GenerateTaskStatus;
          setStatus(newStatus);

          if (event.progress != null) {
            setProgress(event.progress);
            options?.onProgress?.(id, event.progress);
          }

          // ── COMPLETED ──
          if (event.status === "COMPLETED" || event.status === "DONE") {
            const urls =
              event.result?.data?.map((d) => d.url).filter(Boolean) ?? [];
            const elapsed = event.total_time ?? null;
            setResultImages(urls);
            setTotalTime(elapsed);
            setProgress(100);
            closeSSE();
            toast.success(
              `Image generated!${elapsed ? ` (${elapsed.toFixed(1)}s)` : ""}`
            );
            if (options?.onComplete && paramsRef.current) {
              options.onComplete(id, urls, elapsed, paramsRef.current);
            }
          }

          // ── FAILED / ERROR ──
          if (event.status === "FAILED" || event.status === "ERROR") {
            setError(event.error ?? "Generation failed");
            closeSSE();
            toast.error(event.error ?? "Image generation failed");
          }
        },
        (err) => {
          console.error("[useGenerate] SSE stream error:", err);
          const msg = err instanceof Error ? err.message : "Connection lost — please try again";
          setError(msg);
          setStatus("FAILED");
          toast.error("Generation stream connection lost");
        }
      );

      eventSourceRef.current = es;
    },
    [closeSSE, options]
  );

  // ── Main generate function ────────────────────────────────────────

  const generate = useCallback(
    async (params: GenerateParams) => {
      try {
        setStatus("PROCESSING");
        setTaskId(null);
        setResultImages([]);
        setError(null);
        setTotalTime(null);
        setProgress(0);
        paramsRef.current = params;
        startTimeRef.current = Date.now();

        const isSeedream = SEEDREAM_MODEL_NAMES.includes(params.model);

        // ── Pre-process images client-side ──
        let styleFile: File | undefined;
        let faceFile: File | undefined;

        if (params.image) {
          styleFile = await processImageToExactSizeAndFormat(
            params.image,
            params.width,
            params.height
          );
        }
        if (params.image_2) {
          faceFile = await compressFaceImage(params.image_2);
        }

        // ── Build payload ──
        const payload: aiService.GeneratePayload = {
          prompt: params.prompt,
          model: params.model,
          width: params.width,
          height: params.height,
          quality: params.quality,
          orientation: params.orientation,
          face_mode: params.faceMode,
          ref_image_url: params.ref_image_url,
          styleFile,
          faceFile,
        };

        if (isSeedream) {
          // ── Seedream: synchronous → images return directly ──
          const fakeTaskId = `local-${Date.now()}`;
          setTaskId(fakeTaskId);
          options?.onStart?.(fakeTaskId, params);
          startSimulatedProgress(fakeTaskId);

          const result = await aiService.generateImage(payload);
          stopProgress();

          // Seedream returns { data: [{url}] }
          const seedreamResult = result as aiService.SeedreamResult;
          const urls = (seedreamResult.data ?? []).map((d) => d.url).filter(Boolean);

          if (urls.length === 0) throw new Error("No image URLs in response");

          const elapsed = Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10;
          setResultImages(urls);
          setTotalTime(elapsed);
          setProgress(100);
          setStatus("COMPLETED");
          toast.success(`Image generated! (${elapsed}s)`);

          options?.onProgress?.(fakeTaskId, 100);
          options?.onComplete?.(fakeTaskId, urls, elapsed, paramsRef.current!);
        } else {
          // ── ChainHub: async → returns task_id, then SSE stream ──
          setStatus("QUEUED");

          const result = await aiService.generateImage(payload);
          const chainhubResult = result as aiService.ChainHubTaskResult;
          const realTaskId = chainhubResult.task_id;

          if (!realTaskId) throw new Error("No task_id returned from backend");

          setTaskId(realTaskId);
          setStatus((chainhubResult.status as GenerateTaskStatus) ?? "QUEUED");
          options?.onStart?.(realTaskId, params);

          // Start SSE stream (replaces old setInterval polling)
          startSSEStream(realTaskId);
        }
      } catch (err) {
        console.error("[useGenerate] Generate failed:", err);
        stopProgress();
        closeSSE();
        setStatus("FAILED");
        const message = err instanceof Error ? err.message : "Generation failed";
        setError(message);
        toast.error(message);
      }
    },
    [startSimulatedProgress, stopProgress, startSSEStream, closeSSE, options]
  );

  // ── Reset ─────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    closeSSE();
    stopProgress();
    setStatus("IDLE");
    setTaskId(null);
    setResultImages([]);
    setError(null);
    setTotalTime(null);
    setProgress(0);
    paramsRef.current = null;
  }, [closeSSE, stopProgress]);

  // ── Cleanup on unmount ────────────────────────────────────────────

  useEffect(() => {
    return () => {
      closeSSE();
      stopProgress();
    };
  }, [closeSSE, stopProgress]);

  return {
    status,
    taskId,
    resultImages,
    error,
    totalTime,
    progress,
    isGenerating:
      status === "PENDING" || status === "QUEUED" || status === "PROCESSING",
    generate,
    reset,
  };
}
