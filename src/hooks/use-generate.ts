"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type {
  GenerateTaskResponse,
  GenerateTaskStatus,
  GenerateParams,
} from "@/types";
import { SEEDREAM_MODEL_NAMES } from "@/lib/models";
import { toast } from "sonner";

/** Resize, crop, and compress File to exactly the target width × height as JPEG */
async function processImageToExactSizeAndFormat(file: File, width: number, height: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // fallback
        return;
      }
      
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;
      
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, x, y, w, h);
      
      // Use JPEG 0.85 quality — dramatically smaller than PNG 1.0
      // (e.g. 200-400 KB vs 2+ MB for 1024×1024)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], "image.jpg", { type: "image/jpeg" }));
        } else {
          resolve(file); // fallback
        }
      }, "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(file); // fallback if parsing fails
    img.src = URL.createObjectURL(file);
  });
}

const POLL_INTERVAL = 3000; // 3s

interface UseGenerateReturn {
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

interface UseGenerateOptions {
  onStart?: (taskId: string, params: GenerateParams) => void;
  onProgress?: (taskId: string, progress: number) => void;
  onComplete?: (taskId: string, images: string[], totalTime: number | null, params: GenerateParams) => void;
}

export function useGenerate(options?: UseGenerateOptions): UseGenerateReturn {
  const [status, setStatus] = useState<GenerateTaskStatus | "IDLE">("IDLE");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paramsRef = useRef<GenerateParams | null>(null);
  const pollCountRef = useRef(0);
  const startTimeRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  /** Start simulated progress animation (for synchronous API wait) */
  const startSimulatedProgress = useCallback((fakeTaskId: string) => {
    stopProgress();
    let tick = 0;
    progressRef.current = setInterval(() => {
      tick += 1;
      // Exponential curve: approaches 95% but never reaches it
      const p = Math.min(95, Math.round((1 - Math.exp(-tick / 8)) * 100));
      setProgress(p);
      options?.onProgress?.(fakeTaskId, p);
    }, 1000);
  }, [stopProgress, options]);

  // ── Legacy polling (for old ChainHub API) ──
  const pollTask = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/generate/${id}`);
        if (!res.ok) {
          const err = await res.json();
          console.error("[useGenerate] Poll error:", err);
          throw new Error(err.error || "Failed to poll task");
        }

        const data: GenerateTaskResponse = await res.json();
        setStatus(data.status);

        let currentProgress = 0;
        if (data.progress !== undefined && data.progress !== null) {
          currentProgress = data.progress;
        } else if (data.status === "PROCESSING") {
          pollCountRef.current += 1;
          currentProgress = Math.min(95, Math.round((1 - Math.exp(-pollCountRef.current / 8)) * 100));
        } else if (data.status === "COMPLETED") {
          currentProgress = 100;
        }
        setProgress(currentProgress);

        if (options?.onProgress && currentProgress > 0) {
          options.onProgress(id, currentProgress);
        }

        if (data.status === "COMPLETED" && data.result) {
          const urls = data.result.data.map((d) => d.url).filter(Boolean);
          setResultImages(urls);
          setTotalTime(data.total_time);
          stopPolling();
          toast.success(`Image generated successfully!${data.total_time ? ` (${data.total_time.toFixed(1)}s)` : ""}`);
          if (options?.onComplete && paramsRef.current) {
            options.onComplete(id, urls, data.total_time, paramsRef.current);
          }
        } else if (data.status === "FAILED") {
          console.error("[useGenerate] Generation FAILED:", data.error);
          setError(data.error || "Generation failed");
          stopPolling();
          toast.error(data.error || "Image generation failed");
        }
      } catch (err) {
        console.error("[useGenerate] Polling exception:", err);
        setError(err instanceof Error ? err.message : "Polling error");
        stopPolling();
      }
    },
    [stopPolling, options]
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollCountRef.current = 0;
      pollTask(id);
      pollRef.current = setInterval(() => pollTask(id), POLL_INTERVAL);
    },
    [pollTask, stopPolling]
  );

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

        // Build FormData for API route
        const formData = new FormData();
        formData.append("prompt", params.prompt);
        formData.append("model", params.model);
        formData.append("width", params.width.toString());
        formData.append("height", params.height.toString());
        formData.append("quality", params.quality);
        formData.append("orientation", params.orientation);

        if (params.image) {
          const processed1 = await processImageToExactSizeAndFormat(params.image, params.width, params.height);
          formData.append("image", processed1);
        }
        if (params.image_2) {
          const processed2 = await processImageToExactSizeAndFormat(params.image_2, params.width, params.height);
          formData.append("image_2", processed2);
        }

        if (isSeedream) {
          // ── Seedream: synchronous API ──
          const fakeTaskId = `local-${Date.now()}`;
          setTaskId(fakeTaskId);

          // Notify parent — generation started
          options?.onStart?.(fakeTaskId, params);

          // Start simulated progress while waiting
          startSimulatedProgress(fakeTaskId);

          const res = await fetch("/api/generate", {
            method: "POST",
            body: formData,
          });

          stopProgress();

          if (!res.ok) {
            const err = await res.json();
            console.error("[useGenerate] Seedream API error:", err);
            throw new Error(err.error || "Generation failed");
          }

          // Seedream returns {data: [{url: "..."}]} directly
          const data = await res.json();
          const urls = (data.data || [])
            .map((d: { url: string }) => d.url)
            .filter(Boolean);

          if (urls.length === 0) {
            throw new Error("No image URLs in response");
          }

          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000 * 10) / 10;
          setResultImages(urls);
          setTotalTime(elapsed);
          setProgress(100);
          setStatus("COMPLETED");
          toast.success(`Image generated! (${elapsed}s)`);

          // Notify parent — progress 100% then complete
          options?.onProgress?.(fakeTaskId, 100);
          options?.onComplete?.(fakeTaskId, urls, elapsed, paramsRef.current!);
        } else {
          // ── Legacy ChainHub: async polling API ──
          setStatus("QUEUED");

          const res = await fetch("/api/generate", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            console.error("[useGenerate] ChainHub API error:", err);
            throw new Error(err.error || "Failed to submit generation");
          }

          const data: GenerateTaskResponse = await res.json();
          const realTaskId = data.task_id;
          setTaskId(realTaskId);
          setStatus(data.status);

          // Notify parent with REAL task_id (not fakeTaskId)
          options?.onStart?.(realTaskId, params);

          // Start polling with real task_id
          startPolling(realTaskId);
        }
      } catch (err) {
        console.error("[useGenerate] Generate failed:", err);
        stopProgress();
        setStatus("FAILED");
        setError(err instanceof Error ? err.message : "Generation failed");
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
    },
    [startPolling, startSimulatedProgress, stopProgress, options]
  );

  const reset = useCallback(() => {
    stopPolling();
    stopProgress();
    setStatus("IDLE");
    setTaskId(null);
    setResultImages([]);
    setError(null);
    setTotalTime(null);
    setProgress(0);
    paramsRef.current = null;
    pollCountRef.current = 0;
  }, [stopPolling, stopProgress]);

  useEffect(() => {
    return () => {
      stopPolling();
      stopProgress();
    };
  }, [stopPolling, stopProgress]);

  return {
    status,
    taskId,
    resultImages,
    error,
    totalTime,
    progress,
    isGenerating: status === "QUEUED" || status === "PROCESSING",
    generate,
    reset,
  };
}
