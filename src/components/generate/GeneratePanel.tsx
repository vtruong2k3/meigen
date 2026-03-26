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
import type { TrendingPrompt, AspectRatio, Resolution, GenerateParams, ProductAnalysis } from "@/types";
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
  // Gallery URL for face reference (avoids CORS when dragging gallery images)
  const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  // Describe-on-drop state
  const [isDescribing, setIsDescribing] = useState(false);
  const [describePreview, setDescribePreview] = useState<string | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Enhance prompt state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceStyle, setEnhanceStyle] = useState<"realistic" | "anime" | "illustration">("realistic");

  // Product Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [productAnalysis, setProductAnalysis] = useState<ProductAnalysis | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  /** Auto-describe: called when gallery image is dropped into Describe slot */
  const handleAutoDescribe = useCallback(async (imageUrl: string) => {
    setIsDescribing(true);
    setDescribePreview(imageUrl);
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error();
      const { description } = await res.json();
      if (description) setPromptText(description);
    } catch {
      // silently fail — user can type prompt manually
    } finally {
      setIsDescribing(false);
    }
  }, [setPromptText]);

  /** Handle gallery image drop onto Describe slot */
  const handleDescribeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData("text/meigen-image-url");
    if (imageUrl) {
      handleAutoDescribe(imageUrl);
    }
  }, [handleAutoDescribe]);

  /** Analyze product image — send current prompt as template + uploaded image */
  const handleProductAnalyze = useCallback(async (imageUrl: string) => {
    setIsAnalyzing(true);
    setProductPreview(imageUrl);
    try {
      // Send current prompt as the template to adapt
      const payload: Record<string, string> = { imageUrl };
      if (promptText.trim()) {
        payload.templatePrompt = promptText;
      }

      const res = await fetch("/api/analyze-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProductAnalysis(data.analysis as ProductAnalysis);
      // If adapted prompt returned, use it; otherwise keep current
      if (data.adaptedPrompt) {
        setPromptText(data.adaptedPrompt);
        toast.success(`Adapted prompt for: ${data.analysis.name}`);
      } else {
        toast.success(`Detected: ${data.analysis.name}`);
      }
    } catch {
      toast.error("Failed to analyze product");
    } finally {
      setIsAnalyzing(false);
    }
  }, [promptText, setPromptText]);

  /** Handle product image drop from gallery */
  const handleProductDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData("text/meigen-image-url");
    if (imageUrl) {
      handleProductAnalyze(imageUrl);
    }
  }, [handleProductAnalyze]);

  /** Handle product image file upload */
  const handleProductFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setProductPreview(url);
    // Convert to base64 for API
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleProductAnalyze(base64);
    };
    reader.readAsDataURL(file);
  }, [handleProductAnalyze]);

  /** Enhance prompt using MeiGen system prompts */
  const handleEnhance = useCallback(async () => {
    if (!promptText.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText, style: enhanceStyle }),
      });
      if (!res.ok) throw new Error();
      const { enhanced } = await res.json();
      if (enhanced) setPromptText(enhanced);
    } catch {
      // silently fail
    } finally {
      setIsEnhancing(false);
    }
  }, [promptText, enhanceStyle, isEnhancing, setPromptText]);

  /** Insert text at cursor position in prompt textarea */
  const insertMention = useCallback((tag: string) => {
    const el = promptRef.current;
    if (!el) {
      setPromptText((prev) => prev ? `${prev} ${tag}` : tag);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const needsSpace = before.length > 0 && !before.endsWith(" ");
    const newText = `${before}${needsSpace ? " " : ""}${tag} ${after}`;
    setPromptText(newText);
    // Restore cursor after tag
    setTimeout(() => {
      if (el) {
        const pos = start + (needsSpace ? 1 : 0) + tag.length + 1;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [setPromptText]);


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

  /** Handle gallery image dragged into Reference slot — store URL only (no CORS fetch) */
  const handleRefGalleryDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const imageUrl = e.dataTransfer.getData("text/meigen-image-url");
    if (imageUrl) {
      // Store URL directly — backend will fetch it server-side (no CORS issue)
      setRefImageUrl(imageUrl);
      setImagePreview2(imageUrl);   // use URL as preview
      setUploadedImage2(null);      // no local file
      return;
    }
    // Fallback: local file drop from OS
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file, 2);
      setRefImageUrl(null);         // local file, no URL needed
    }
  }, [handleFileUpload]);


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

    // @face: needs reference image in slot 2 (Face / Reference slot)
    const hasFaceMention = /@face\b/i.test(promptText);
    const hasRefImage = !!uploadedImage2 || !!refImageUrl;

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
      ref_image_url: refImageUrl || undefined,
      // faceMode: @face in prompt AND reference face image available (file OR gallery URL)
      faceMode: hasFaceMention && hasRefImage,
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
              {/* Describe Image section — gallery drag only */}
              <div
                onDrop={handleDescribeDrop}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors",
                  isDescribing
                    ? "border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20"
                    : describePreview
                      ? "border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20"
                      : "border-border hover:border-foreground/30 cursor-grab"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  describePreview ? "bg-cyan-100 dark:bg-cyan-900/40" : "bg-muted"
                )}>
                  {isDescribing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : describePreview ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {isDescribing ? "Analyzing image..." : describePreview ? "Prompt generated" : "Describe Image"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isDescribing ? "AI is analyzing your image" : describePreview ? "Prompt has been auto-filled" : "Drag image from gallery to generate prompt"}
                  </p>
                </div>
                {describePreview && (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 group/desc">
                    <Image src={describePreview} alt="described" width={36} height={36} unoptimized className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setDescribePreview(null); setPromptText(""); }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/desc:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
              </div>

              {/* Product / Food Analysis slot */}
              <div
                onDrop={handleProductDrop}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onClick={() => !productAnalysis && productFileRef.current?.click()}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors",
                  isAnalyzing
                    ? "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20"
                    : productAnalysis
                      ? "border-orange-400 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border-border hover:border-foreground/30 cursor-pointer"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  productAnalysis ? "bg-orange-100 dark:bg-orange-900/40" : "bg-muted"
                )}>
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  ) : productAnalysis ? (
                    <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  ) : (
                    <span className="text-sm">🍽️</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {isAnalyzing ? "Analyzing..." : productAnalysis ? productAnalysis.name : "Food / Product"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAnalyzing
                      ? "AI is analyzing your food/product"
                      : productAnalysis
                        ? `${productAnalysis.category}${productAnalysis.brand ? ` • ${productAnalysis.brand}` : ""} • ${productAnalysis.colors.join(", ")}`
                        : "Upload or drag food/product for AI advertising"}
                  </p>
                </div>
                {productPreview && (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 group/prod">
                    <Image src={productPreview} alt="product" width={36} height={36} unoptimized className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setProductAnalysis(null); setProductPreview(null); setPromptText(""); }}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/prod:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <input
                  ref={productFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProductFileUpload(f);
                  }}
                />
              </div>

              {/* Product analysis info chips */}
              {productAnalysis && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {productAnalysis.ingredients.slice(0, 4).map((ing) => (
                    <span
                      key={ing}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40"
                    >
                      {ing}
                    </span>
                  ))}
                  {promptText.trim() && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Prompt adapted</span>
                  )}
                </div>
              )}

              {/* Reference / Face slot — accepts file upload OR gallery drag */}
              <div
                onDrop={handleRefGalleryDrop}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                onClick={() => fileInput2Ref.current?.click()}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border border-dashed transition-colors cursor-pointer group",
                  imagePreview2
                    ? "border-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/20"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  imagePreview2 ? "bg-fuchsia-100 dark:bg-fuchsia-900/40" : "bg-muted group-hover:bg-muted/80"
                )}>
                  <ImageIcon className={cn("w-4 h-4", imagePreview2 ? "text-fuchsia-500" : "text-muted-foreground")} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">
                    {imagePreview2 ? "Face reference set" : "Face / Reference"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {imagePreview2 ? "Add @face in prompt to preserve identity" : "Upload or drag face photo — required for @face"}
                  </p>
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
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold">Prompt</p>
                    {/* Style selector */}
                    <select
                      value={enhanceStyle}
                      onChange={(e) => setEnhanceStyle(e.target.value as "realistic" | "anime" | "illustration")}
                      className="text-[10px] bg-muted border-0 rounded-md px-1.5 py-0.5 text-muted-foreground focus:ring-1 focus:ring-foreground/20"
                    >
                      <option value="realistic">Realistic</option>
                      <option value="anime">Anime</option>
                      <option value="illustration">Illustration</option>
                    </select>
                  </div>
                  <button
                    onClick={handleEnhance}
                    disabled={!promptText.trim() || isEnhancing}
                    className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30"
                    title="Enhance prompt with AI"
                  >
                    {isEnhancing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  {/* Analyzing overlay shown while auto-describing */}
                  {isDescribing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm border border-border">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <p className="text-[12px] text-muted-foreground">Analyzing image...</p>
                    </div>
                  )}
                  {/* Enhancing overlay */}
                  {isEnhancing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm border border-cyan-500/30 dark:border-cyan-500/30">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      <p className="text-[12px] text-cyan-600 dark:text-cyan-400">Enhancing prompt...</p>
                    </div>
                  )}
                  <Textarea
                    ref={promptRef}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={isDescribing ? "" : "Describe what you want to generate... or drop an image above"}
                    className="min-h-[180px] max-h-[300px] resize-none text-[13px] leading-relaxed rounded-xl border-border focus-visible:ring-1 focus-visible:ring-foreground/20 p-3"
                  />
                  {/* Enhance + action icons */}
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <button
                      onClick={handleEnhance}
                      disabled={!promptText.trim() || isEnhancing}
                      className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors disabled:opacity-30"
                    >
                      {isEnhancing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {isEnhancing ? "Enhancing..." : "Enhance"}
                    </button>
                  </div>
                </div>

                {/* @mention chips — shown when reference images are uploaded */}
                {(uploadedImage || uploadedImage2) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-muted-foreground">Mention:</span>
                    {uploadedImage && (
                      <button
                        onClick={() => insertMention("@image1")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-[11px] hover:bg-muted transition-colors"
                      >
                        <div className="w-3.5 h-3.5 rounded-sm overflow-hidden">
                          <Image src={imagePreview!} alt="" width={14} height={14} unoptimized className="w-full h-full object-cover" />
                        </div>
                        @image1
                      </button>
                    )}
                    {uploadedImage2 && (
                      <button
                        onClick={() => insertMention("@image2")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border text-[11px] hover:bg-muted transition-colors"
                      >
                        <div className="w-3.5 h-3.5 rounded-sm overflow-hidden">
                          <Image src={imagePreview2!} alt="" width={14} height={14} unoptimized className="w-full h-full object-cover" />
                        </div>
                        @image2
                      </button>
                    )}
                    {uploadedImage && (
                      <button
                        onClick={() => insertMention("@face")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-fuchsia-400 dark:border-fuchsia-700 text-fuchsia-700 dark:text-fuchsia-300 text-[11px] hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                        </svg>
                        @face
                      </button>
                    )}
                  </div>
                )}
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
                    {(() => {
                      const [w, h] = aspectRatio.split(":").map(Number);
                      const maxDim = 12;
                      const scale = maxDim / Math.max(w, h);
                      const rw = Math.round(w * scale);
                      const rh = Math.round(h * scale);
                      return (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x={(14 - rw) / 2} y={(14 - rh) / 2} width={rw} height={rh} rx="1.5" />
                        </svg>
                      );
                    })()}
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
                        {selectedModel.supportedRatios.map((r) => {
                          const [w, h] = r.split(":").map(Number);
                          const maxDim = 10;
                          const scale = maxDim / Math.max(w, h);
                          const rw = Math.max(3, Math.round(w * scale));
                          const rh = Math.max(3, Math.round(h * scale));
                          return (
                            <button
                              key={r}
                              onClick={() => { setAspectRatio(r); setShowAspectMenu(false); }}
                              className={cn(
                                "flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-md text-left hover:bg-muted transition-colors",
                                aspectRatio === r && "bg-muted font-semibold"
                              )}
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground shrink-0">
                                <rect x={(12 - rw) / 2} y={(12 - rh) / 2} width={rw} height={rh} rx="1" />
                              </svg>
                              {r}
                            </button>
                          );
                        })}
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
                <Sparkles className={cn("w-3.5 h-3.5", selectedModel.icon === "seededit" ? "text-pink-500" : "text-cyan-400")} />
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
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
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
