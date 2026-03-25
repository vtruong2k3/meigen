"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Layers, Heart } from "lucide-react";
import { FloatingBottomBar } from "@/components/layout/FloatingBottomBar";
import { ImageCard } from "@/components/gallery/ImageCard";
import type { TrendingPrompt } from "@/types";
import Masonry from "react-masonry-css";

interface FavoritesPageProps {
  onBack: () => void;
  favoritePrompts: TrendingPrompt[];
  onToggleFavorite: (promptId: string) => void;
  onSelectPrompt: (prompt: TrendingPrompt) => void;
}

const tabs = ["All", "Posts", "Creations"] as const;

export function FavoritesPage({
  onBack,
  favoritePrompts,
  onToggleFavorite,
  onSelectPrompt,
}: FavoritesPageProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All");

  return (
    <>
      {/* Main container */}
      <div className="flex-1 m-4 bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-2rem)]">
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
            <h1 className="text-base font-semibold">Favorites</h1>
            {favoritePrompts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({favoritePrompts.length})
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                  activeTab === tab
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {favoritePrompts.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            <Masonry
              breakpointCols={{ default: 4, 1280: 3, 1024: 3, 640: 2 }}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {favoritePrompts.map((prompt) => (
                <ImageCard
                  key={prompt.id}
                  prompt={prompt}
                  onClick={() => onSelectPrompt(prompt)}
                />
              ))}
            </Masonry>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
            <div className="w-16 h-16 mb-5 rounded-full bg-muted/50 flex items-center justify-center">
              <Heart className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1.5">
              No favorites yet
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Click the heart button on images you love to collect them here
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <FloatingBottomBar />
    </>
  );
}
