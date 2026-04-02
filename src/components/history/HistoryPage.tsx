"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, LayoutGrid, LayoutList, Trash2 } from "lucide-react";

import { ImageCard } from "@/components/gallery/ImageCard";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TrendingPrompt, GenerationHistoryItem } from "@/types";
import Masonry from "react-masonry-css";
import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";

type HistoryTab = "viewed" | "generations";

interface HistoryPageProps {
  onBack: () => void;
  historyPrompts: TrendingPrompt[];
  /** True while /api/trending/bulk is fetching prompt details for viewed IDs */
  isLoadingPrompts?: boolean;
  onClearHistory: () => void;
  onSelectPrompt: (prompt: TrendingPrompt) => void;
  generations: GenerationHistoryItem[];
  onClearGenerations: () => void;
  onSelectGeneration?: (gen: GenerationHistoryItem) => void;
}

/* Circular progress indicator */
function CircularProgress({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-foreground transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {value}
      </span>
    </div>
  );
}

export function HistoryPage({
  onBack,
  historyPrompts,
  isLoadingPrompts = false,
  onClearHistory,
  onSelectPrompt,
  generations,
  onClearGenerations,
  onSelectGeneration,
}: HistoryPageProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<HistoryTab>("generations");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleClear = () => {
    if (tab === "viewed") {
      onClearHistory();
      toast.success("View history cleared");
    } else {
      onClearGenerations();
      toast.success("Generation history cleared");
    }
  };

  const currentCount = tab === "viewed" ? historyPrompts.length : generations.length;

  return (
    <>
      <div className="flex-1 m-4 bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-base font-semibold">Creations</h1>
            {currentCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({currentCount})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {currentCount > 0 && (
              <button
                onClick={handleClear}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                viewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-border/30">
          <button
            onClick={() => setTab("generations")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === "generations"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Generations
            {generations.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({generations.length})</span>
            )}
          </button>
          <button
            onClick={() => setTab("viewed")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === "viewed"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Viewed
            {historyPrompts.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({historyPrompts.length})</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Generations tab */}
          {tab === "generations" && (
            <>
              {generations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
                  {generations.map((gen) => (
                    <div
                      key={gen.id}
                      onClick={() => gen.imageUrl && gen.status === "COMPLETED" && onSelectGeneration?.(gen)}
                      className={cn(
                        "rounded-xl overflow-hidden border border-border aspect-3/4 relative group",
                        gen.imageUrl && "cursor-pointer hover:opacity-90 transition-opacity"
                      )}
                    >
                      {gen.status === "COMPLETED" && gen.imageUrl ? (
                        <Image
                          src={gen.imageUrl}
                          alt={gen.prompt.slice(0, 50)}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : gen.status === "FAILED" ? (
                        <div className="w-full h-full bg-card flex flex-col items-center justify-center gap-3 p-4">
                          {/* Broken image illustration */}
                          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" className="text-muted-foreground/25">
                            {/* Image frame */}
                            <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
                            {/* Crack lines */}
                            <path d="M32 12L28 28L36 32L30 52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            {/* Mountain/landscape inside */}
                            <path d="M8 44l12-10 8 6 10-14 18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
                            {/* Sun */}
                            <circle cx="46" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                            {/* Warning badge */}
                            <circle cx="52" cy="12" r="9" fill="var(--destructive, #ff00e5)" opacity="0.15" />
                            <path d="M52 7v6M52 15.5v.5" stroke="var(--destructive, #ff00e5)" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          {/* Error message */}
                          <div className="text-center space-y-1 px-2">
                            <p className="text-xs font-medium text-foreground leading-tight">
                              {gen.error || "High demand right now, credits refunded"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Credits refunded</p>
                          </div>
                          {/* Retry button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectGeneration?.(gen); }}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                              <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Retry
                          </button>
                        </div>
                      ) : (
                        /* Processing — circular progress */
                        <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                          <CircularProgress value={gen.progress} />
                        </div>
                      )}

                      {/* Overlay info on hover */}
                      {gen.status === "COMPLETED" && gen.imageUrl && (
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white/80 line-clamp-2">
                            {gen.prompt.slice(0, 80)}
                          </p>
                          {gen.totalTime && (
                            <p className="text-[9px] text-white/50 mt-0.5">
                              {gen.totalTime.toFixed(1)}s • {gen.width}×{gen.height}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
                  <div className="w-16 h-16 mb-4 text-muted-foreground/30">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold mb-1">No generations yet</h2>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Use a prompt to generate an image and it will appear here
                  </p>
                </div>
              )}
            </>
          )}

          {/* Viewed tab */}
          {tab === "viewed" && (
            <>
              {isLoadingPrompts ? (
                /* Skeleton shimmer while bulk-fetch is running */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl bg-muted"
                      style={{ height: i % 3 === 0 ? 280 : i % 3 === 1 ? 220 : 250 }}
                    />
                  ))}
                </div>
              ) : historyPrompts.length > 0 ? (
                <Masonry
                  breakpointCols={{ default: 4, 1280: 3, 1024: 3, 640: 2 }}
                  className="masonry-grid"
                  columnClassName="masonry-grid-column"
                >
                  {historyPrompts.map((prompt) => (
                    <ImageCard
                      key={prompt.id}
                      prompt={prompt}
                      onClick={() => onSelectPrompt(prompt)}
                    />
                  ))}
                </Masonry>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
                  <div className="w-24 h-24 mb-6 text-muted-foreground/30">
                    <svg viewBox="0 0 100 100" fill="none">
                      <circle cx="50" cy="30" r="14" stroke="currentColor" strokeWidth="2" />
                      <path d="M50 44c-12 0-20 8-20 18v6h40v-6c0-10-8-18-20-18z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold mb-1.5">The canvas is blank</h2>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    But not for long. Let&apos;s turn your imagination into pixels
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>



      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-auto p-0 bg-black/95 border-none rounded-2xl overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div className="relative">
              <Image
                src={previewImage}
                alt="Generated preview"
                width={800}
                height={1200}
                unoptimized
                className="max-h-[85vh] w-auto mx-auto"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Link
                  href={previewImage}
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
