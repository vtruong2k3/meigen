"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Minus,
  Plus,
  Lock,
  Sparkles,
  ChevronDown,
  Upload,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn, formatPromptText } from "@/lib/utils";
import { useGenerate } from "@/hooks/use-generate";
import type { TrendingPrompt, AspectRatio, Resolution, GenerateParams } from "@/types";
import { MODELS, ALL_ASPECT_RATIOS, ASPECT_TO_SIZE, getSizeForModel, type ModelConfig } from "@/lib/models";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

const resolutions: Resolution[] = ["sd", "hd"];

/* ── Types ──────────────────────────────────────── */
interface GeneratePanelProps {
  open: boolean;
  mode: "prompt" | "ref" | null;
  prompt: TrendingPrompt | null;
  onClose: () => void;
  onGenerationStart?: (taskId: string, prompt: string, width: number, height: number, quality: "sd" | "hd") => void;
  onGenerationProgress?: (taskId: string, progress: number) => void;
  onGenerationComplete?: (taskId: string, images: string[], totalTime: number | null, params: GenerateParams) => void;
  onNavigateHistory?: () => void;
}

/* ── Component ─────────────────────────────────── */
export function GeneratePanel({ open, mode, prompt, onClose, onGenerationStart, onGenerationProgress, onGenerationComplete, onNavigateHistory }: GeneratePanelProps) {
  const [promptText, setPromptText] = useState("");
  const [imageCount, setImageCount] = useState(1);
  const [maxImages] = useState(4);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3:4");
  const [resolution, setResolution] = useState<Resolution>("sd");
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showResMenu, setShowResMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig>(MODELS[0]);

  // Auto-reset aspect ratio when model changes and current ratio is unsupported
  useEffect(() => {
    if (!selectedModel.supportedRatios.includes(aspectRatio)) {
      setAspectRatio(selectedModel.supportedRatios[0]);
    }
  }, [selectedModel, aspectRatio]);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // File uploads
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImage2, setUploadedImage2] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreview2, setImagePreview2] = useState<string | null>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleStart = useCallback(
    (taskId: string, params: GenerateParams) => {
      onGenerationStart?.(taskId, params.prompt, params.width, params.height, params.quality as "sd" | "hd");
    },
    [onGenerationStart]
  );

  const {
    status,
    resultImages,
    error,
    totalTime,
    progress,
    isGenerating,
    generate,
    reset,
  } = useGenerate({ onStart: handleStart, onProgress: onGenerationProgress, onComplete: onGenerationComplete });

  // Pre-fill based on mode — reset generation state for new prompt
  useEffect(() => {
    if (!prompt || !open) return;
    // Reset previous generation
    reset();
    setUploadedImage(null);
    setUploadedImage2(null);
    setImagePreview(null);
    setImagePreview2(null);

    if (mode === "prompt") {
      setPromptText(formatPromptText(prompt.prompt));
      setRefImage(null);
    } else if (mode === "ref") {
      setPromptText("");
      setRefImage(prompt.image);
    }
  }, [prompt, mode, open, reset]);

  const handleFileUpload = useCallback((file: File, slot: 1 | 2) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    if (slot === 1) {
      setUploadedImage(file);
      setImagePreview(url);
    } else {
      setUploadedImage2(file);
      setImagePreview2(url);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, slot: 1 | 2) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file, slot);
    },
    [handleFileUpload]
  );

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    const size = getSizeForModel(selectedModel.apiName, aspectRatio);
    const orientation = size.height > size.width ? "portrait" : "landscape";

    // Navigate to History immediately to see progress
    onNavigateHistory?.();

    generate({
      prompt: promptText,
      model: selectedModel.apiName,
      width: size.width,
      height: size.height,
      quality: resolution,
      orientation,
      image: uploadedImage || undefined,
      image_2: uploadedImage2 || undefined,
    });
  };

  if (!open) return null;

  const statusLabel: Record<string, string> = {
    IDLE: "",
    QUEUED: "Queued...",
    PROCESSING: "Generating...",
    COMPLETED: "Completed!",
    FAILED: "Failed",
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          className="w-[340px] min-w-[340px] sticky top-0 self-start my-4 mr-4 h-[calc(100vh-2rem)] bg-background rounded-2xl border border-border flex flex-col shadow-lg overflow-hidden"
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold">Generate</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={reset}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="New generation"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Scrollable middle content */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className="space-y-4 px-5 pb-4">
              {/* Describe Image section */}
              <div
                onDrop={(e) => handleDrop(e, 1)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInput1Ref.current?.click()}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-foreground/30 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">Describe Image</p>
                  <p className="text-[11px] text-muted-foreground">Drop image to generate a prompt</p>
                </div>
                {(imagePreview || (prompt && mode === "ref")) && (
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative group/ref">
                    <Image
                      src={imagePreview || prompt?.image || ""}
                      alt="ref"
                      width={36}
                      height={36}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <input
                  ref={fileInput1Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 1);
                  }}
                />
              </div>

              {/* Reference Image section */}
              <div
                onDrop={(e) => handleDrop(e, 2)}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInput2Ref.current?.click()}
                className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border hover:border-foreground/30 transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">Drop or upload reference</p>
                  <p className="text-[11px] text-muted-foreground">optional</p>
                </div>
                {imagePreview2 ? (
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 relative group/ref">
                    <Image
                      src={imagePreview2}
                      alt="reference"
                      width={36}
                      height={36}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage2(null);
                        setImagePreview2(null);
                      }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg border border-dashed border-border flex items-center justify-center hover:border-foreground/30 transition-colors shrink-0">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={fileInput2Ref}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 2);
                  }}
                />
              </div>

              <Separator />

              {/* Prompt section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold">Prompt</p>
                  <button className="p-1 rounded-md hover:bg-muted transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="relative">
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe what you want to generate..."
                    className="min-h-[180px] max-h-[300px] resize-none text-[13px] leading-relaxed rounded-xl border-border focus-visible:ring-1 focus-visible:ring-foreground/20 p-3"
                  />
                  {/* Enhance + action icons */}
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <button className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
                      <Sparkles className="w-3 h-3" />
                      Enhance
                    </button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Settings bar */}
              <div className="flex items-center justify-between">
                {/* Image count */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setImageCount(Math.max(1, imageCount - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold min-w-[28px] text-center">
                    {imageCount}/{maxImages}
                  </span>
                  <button
                    onClick={() => setImageCount(Math.min(maxImages, imageCount + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Lock */}
                <button className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                </button>

                {/* Aspect ratio */}
                <div className="relative">
                  <button
                    onClick={() => { setShowAspectMenu(!showAspectMenu); setShowResMenu(false); }}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                    {aspectRatio}
                  </button>
                  <AnimatePresence>
                    {showAspectMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full left-0 mb-1 bg-background rounded-lg border border-border shadow-lg p-1 z-20 min-w-[100px]"
                      >
                        {selectedModel.supportedRatios.map((r) => (
                          <button
                            key={r}
                            onClick={() => { setAspectRatio(r); setShowAspectMenu(false); }}
                            className={cn(
                              "flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md text-left hover:bg-muted transition-colors",
                              aspectRatio === r && "bg-muted font-semibold"
                            )}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                            </svg>
                            {r}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Resolution */}
                <div className="relative">
                  <button
                    onClick={() => { setShowResMenu(!showResMenu); setShowAspectMenu(false); }}
                    className="flex items-center gap-1 px-2.5 h-7 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                    </svg>
                    {resolution.toUpperCase()}
                  </button>
                  <AnimatePresence>
                    {showResMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute bottom-full right-0 mb-1 bg-background rounded-lg border border-border shadow-lg p-1.5 z-20 min-w-[200px]"
                      >
                        {resolutions.map((r) => (
                          <button
                            key={r}
                            onClick={() => { setResolution(r); setShowResMenu(false); }}
                            className={cn(
                              "flex items-center justify-between w-full px-3 py-2 text-left rounded-md hover:bg-muted transition-colors",
                              resolution === r && "bg-muted"
                            )}
                          >
                            <div>
                              <p className="text-xs font-semibold">{r.toUpperCase()}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {r === "sd" ? "Standard quality" : "High definition"}
                              </p>
                            </div>
                            {r === "hd" && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Error */}
              {status === "FAILED" && error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-[12px] text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

            </div>
          </ScrollArea>

          {/* Fixed bottom section */}
          <div className="px-5 pb-4 pt-3 space-y-3 border-t border-border">
            {/* Status indicator */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40"
              >
                <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-[11px] text-blue-800 dark:text-blue-300 flex-1">
                  {statusLabel[status]}
                </span>
              </motion.div>
            )}

            {/* Model notice */}
            {!isGenerating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/40">
                <span className="text-[11px] text-orange-800 dark:text-orange-300 flex-1">
                  Nanobanana 2 / Seedream 5.0 available 🔥
                </span>
                <button className="text-orange-600 dark:text-orange-400 hover:text-orange-800 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", selectedModel.color)} />
                <Sparkles className={cn("w-3.5 h-3.5", selectedModel.icon === "seededit" ? "text-pink-500" : "text-emerald-500")} />
                <span className="text-[13px] font-medium flex-1 text-left">{selectedModel.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showModelMenu && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showModelMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute bottom-full left-0 right-0 mb-1 bg-background rounded-xl border border-border shadow-lg p-1.5 z-30"
                  >
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => { setSelectedModel(model); setShowModelMenu(false); }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors",
                          selectedModel.id === model.id && "bg-muted"
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full shrink-0", model.color)} />
                        <div className="flex-1 text-left">
                          <p className="text-[13px] font-medium">{model.label}</p>
                          <p className="text-[10px] text-muted-foreground">{model.description}</p>
                        </div>
                        {selectedModel.id === model.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !promptText.trim()}
              className={cn(
                "w-full h-12 rounded-xl text-sm font-semibold gap-2 transition-all",
                isGenerating
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground text-background hover:bg-foreground/90"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusLabel[status]}
                </>
              ) : (
                <>
                  Generate
                  <span className="flex items-center gap-1 text-xs opacity-80">
                    ✦ 10
                  </span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-auto p-0 bg-black/95 border-none rounded-2xl overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div className="relative">
              <Image
                src={previewImage!}
                alt="Generated preview"
                width={800}
                height={1200}
                unoptimized
                className="max-h-[85vh] w-auto mx-auto"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Link
                  href={previewImage!}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
