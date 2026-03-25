"use client";

import { cn, formatPromptText } from "@/lib/utils";
import type { TrendingPrompt } from "@/types";
import { formatViews, formatRelativeDate, getModelLabel } from "@/lib/mock-data";
import { GoogleGIcon } from "@/components/common/icons";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { PhotoProvider, PhotoView } from "react-photo-view";
import {
  X,
  Heart,
  Download,
  BarChart3,
  Clock,
  Copy,
  Languages,
  RefreshCw,
  ImageIcon,
  Layers,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface PromptDetailPanelProps {
  prompt: TrendingPrompt | null;
  onClose: () => void;
  onUseAsPrompt?: (prompt: TrendingPrompt) => void;
  onUseAsRef?: (prompt: TrendingPrompt) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (promptId: string) => void;
}

export function PromptDetailPanel({
  prompt,
  onClose,
  onUseAsPrompt,
  onUseAsRef,
  isFavorite = false,
  onToggleFavorite,
}: PromptDetailPanelProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!prompt) return null;

  const handleCopy = () => {
    copy(prompt.prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.(prompt.id);
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const activeImage = prompt.images[activeImageIndex] || prompt.image;
  const totalImages = prompt.images.length || 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Top Bar — floating */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 md:left-auto md:translate-x-0 md:right-[440px]">
        {/* Image counter */}
        {totalImages > 1 && (
          <span className="px-3 py-1.5 bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full border border-border/40 shadow-sm text-xs font-medium">
            {activeImageIndex + 1} / {totalImages}
          </span>
        )}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 backdrop-blur-md rounded-full border shadow-sm text-xs font-medium transition-colors",
            isFavorite
              ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
              : "bg-card/80 dark:bg-card/80 border-border/40 hover:bg-card dark:hover:bg-muted-active"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-current")} />
          {isFavorite ? "Favorited" : "Add Favorite"}
        </button>
        <button className="flex items-center justify-center w-8 h-8 bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full border border-border/40 shadow-sm hover:bg-card dark:hover:bg-muted-active transition-colors">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="flex items-center bg-card/80 dark:bg-card/80 backdrop-blur-md rounded-full border border-border/40 shadow-sm hover:bg-card dark:hover:bg-muted-active transition-colors overflow-hidden"
        >
          <span className="px-3 py-1.5 text-[11px] font-medium">esc</span>
          <span className="w-[0.5px] h-5 bg-border/40" />
          <span className="px-2.5 py-1.5 flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Main layout */}
      <div className="fixed inset-0 z-50 flex pointer-events-none">
        {/* LEFT — Main image area with PhotoProvider */}
        <div
          className="flex-1 flex items-center justify-center p-6 pointer-events-auto"
          onClick={onClose}
        >
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* Left arrow */}
            {totalImages > 1 && (
              <button
                className="flex items-center justify-center w-10 h-10 mr-60 rounded-full bg-card/80 dark:bg-card/80 backdrop-blur-md border border-border/40 shadow-md hover:bg-card dark:hover:bg-muted-active transition-colors shrink-0 disabled:opacity-30"
                onClick={() => setActiveImageIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeImageIndex === 0}
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}

            {/* Main image — with zoom via react-photo-view */}
            {activeImage ? (
              <PhotoProvider>
                <PhotoView src={activeImage}>
                  <div className="relative max-w-[700px] max-h-[calc(100vh-80px)] rounded-3xl overflow-hidden shadow-2xl cursor-zoom-in">
                    <Image
                      src={activeImage}
                      alt={`AI prompt by ${prompt.author_name}`}
                      width={1000}
                      height={1200}
                      className="w-full h-auto max-h-[calc(100vh-80px)] object-contain"
                      priority
                    />
                  </div>
                </PhotoView>
              </PhotoProvider>
            ) : (
              <div className="w-[400px] h-[400px] max-w-[90vw] bg-muted dark:bg-secondary rounded-3xl flex flex-col items-center justify-center p-6 text-center ring-1 ring-border shadow-xl">
                <ImageIcon className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <h4 className="text-muted-foreground font-semibold mb-1">Text Prompt Only</h4>
                <p className="text-muted-foreground text-[12px]">No image visualization available</p>
              </div>
            )}

            {/* Thumbnails — right of image */}
            {totalImages > 1 && (
              <div className="flex flex-col items-center gap-2">
                {prompt.images.map((imgUrl, i) => (
                  <button
                    key={i}
                    className={cn(
                      "w-[60px] h-[60px] rounded-lg overflow-hidden border-2 transition-all duration-200 shrink-0",
                      activeImageIndex === i
                        ? "border-white opacity-100 shadow-lg ring-1 ring-black/10"
                        : "border-transparent opacity-50 hover:opacity-80"
                    )}
                    onClick={() => setActiveImageIndex(i)}
                  >
                    <Image
                      src={imgUrl}
                      alt={`Thumb ${i + 1}`}
                      width={60}
                      height={60}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Right arrow */}
            {totalImages > 1 && (
              <button
                className="flex items-center justify-center w-10 h-10 ml-60 rounded-full bg-card/80 dark:bg-card/80 backdrop-blur-md border border-border/40 shadow-md hover:bg-card dark:hover:bg-muted-active transition-colors shrink-0 disabled:opacity-30"
                onClick={() => setActiveImageIndex((prev) => Math.min(totalImages - 1, prev + 1))}
                disabled={activeImageIndex === totalImages - 1}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — Info sidebar */}
        <div className="w-[400px] min-w-[400px] h-full bg-background flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300 shadow-[-4px_0_20px_rgba(0,0,0,0.05)]">
          {/* Author section */}
          <div className="flex items-start justify-between px-5 pt-5 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm shrink-0">
                {prompt.author_name[0]}
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-tight">{prompt.author_name}</p>
                <p className="text-xs text-muted-foreground">@{prompt.author}</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[11px] font-medium text-muted-foreground shrink-0">
              {prompt.model === "nanobanana" && <GoogleGIcon size={12} />}
              {getModelLabel(prompt.model)}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 px-5 pb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatViews(prompt.likes)}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              {formatViews(prompt.views)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeDate(prompt.date)}
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-5" />

          {/* Prompt text — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 scrollbar-hide">
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-0 right-0 p-1.5 rounded-md hover:bg-muted transition-colors z-10"
                title="Copy prompt"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <p className="text-[13px] leading-[1.7] pr-8 text-foreground whitespace-pre-wrap wrap-break-word">
                {formatPromptText(prompt.prompt)}
              </p>
            </div>
          </div>

          {/* Translate — fixed, not scrollable */}
          <div className="px-5 py-2">
            <button className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <Languages className="w-4 h-4" />
              Translate
            </button>
          </div>

          {/* Bottom CTA — sticky */}
          <div className="flex items-center gap-3 p-4">
            <button
              onClick={() => { if (prompt && onUseAsPrompt) onUseAsPrompt(prompt); }}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Use as Prompt
            </button>
            <button
              onClick={() => { if (prompt && onUseAsRef) onUseAsRef(prompt); }}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Use as Ref
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
