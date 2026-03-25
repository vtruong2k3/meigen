"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { HeaderTabs } from "@/components/layout/HeaderTabs";
import { FloatingBottomBar } from "@/components/layout/FloatingBottomBar";
import { MasonryGallery } from "@/components/gallery/MasonryGallery";
import { PromptDetailPanel } from "@/components/prompt/PromptDetailPanel";
import { GeneratePanel } from "@/components/generate/GeneratePanel";
import { SearchDialog } from "@/components/search/SearchDialog";
import { HistoryPage } from "@/components/history/HistoryPage";
import { FavoritesPage } from "@/components/favorites/FavoritesPage";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { trendingPrompts, categoryItems, modelTabs } from "@/lib/mock-data";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { useGenerationHistory } from "@/hooks/use-generation-history";
import type { TrendingPrompt, AppView, GenerateMode, GenerateParams, GenerationHistoryItem } from "@/types";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeModel, setActiveModel] = useState("all");
  const [activeSort, setActiveSort] = useState("featured");
  const [selectedPrompt, setSelectedPrompt] = useState<TrendingPrompt | null>(null);

  // Infinite Scroll state
  const [visibleCount, setVisibleCount] = useState(40);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("home");

  // Generate panel state
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMode, setGenerateMode] = useState<GenerateMode | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState<TrendingPrompt | null>(null);

  // Favorites & History hooks
  const favorites = useFavorites();
  const history = useHistory();
  const genHistory = useGenerationHistory();

  const handleGenerationComplete = useCallback(
    (taskId: string, images: string[], totalTime: number | null, params: GenerateParams) => {
      genHistory.updateGeneration(taskId, {
        status: "COMPLETED",
        progress: 100,
        imageUrl: images[0] || undefined,
        totalTime: totalTime ?? undefined,
      });
    },
    [genHistory]
  );

  const handleGenerationStart = useCallback(
    (taskId: string, prompt: string, width: number, height: number, quality: "sd" | "hd") => {
      genHistory.addGeneration({ taskId, prompt, width, height, quality });
    },
    [genHistory]
  );

  const handleGenerationProgress = useCallback(
    (taskId: string, progress: number) => {
      genHistory.updateGeneration(taskId, { progress });
    },
    [genHistory]
  );

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let result = [...trendingPrompts];

    // Filter by category
    if (activeCategory !== "all") {
      const cat = categoryItems.find((c) => c.id === activeCategory);
      if (cat?.categoryValue) {
        result = result.filter((p) =>
          p.categories.includes(cat.categoryValue!)
        );
      }
    }

    // Filter by model
    if (activeModel !== "all") {
      const model = modelTabs.find((m) => m.id === activeModel);
      if (model?.modelValue) {
        result = result.filter((p) => p.model === model.modelValue);
      }
    }

    // Sort
    if (activeSort === "newest") {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (activeSort === "popular") {
      result.sort((a, b) => b.views - a.views);
    }
    return result.slice(0, visibleCount);
  }, [activeCategory, activeModel, activeSort, visibleCount]);

  // Reset infinite scroll when filters change
  useEffect(() => {
    setVisibleCount(40);
  }, [activeCategory, activeModel, activeSort]);

  // Handle infinite scroll event
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when user scrolls within 500px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 5000) {
      setVisibleCount((prev) => prev + 30);
    }
  };

  const handleSelectPrompt = (prompt: TrendingPrompt) => {
    setSelectedPrompt(prompt);
    history.addToHistory(prompt.id);
  };

  const handleUseAsPrompt = (prompt: TrendingPrompt) => {
    setSelectedPrompt(null);
    setGeneratePrompt(prompt);
    setGenerateMode("prompt");
    setGenerateOpen(true);
  };

  const handleUseAsRef = (prompt: TrendingPrompt) => {
    setSelectedPrompt(null);
    setGeneratePrompt(prompt);
    setGenerateMode("ref");
    setGenerateOpen(true);
  };

  const handleSelectGeneration = (gen: GenerationHistoryItem) => {
    if (!gen.imageUrl) return;
    // Convert GenerationHistoryItem to a TrendingPrompt-compatible object
    const fakePrompt: TrendingPrompt = {
      id: gen.id,
      rank: 0,
      prompt: gen.prompt,
      author: "you",
      author_name: "You",
      likes: 0,
      views: 0,
      image: gen.imageUrl,
      images: [gen.imageUrl],
      model: "chainhub" as TrendingPrompt["model"],
      categories: [],
      date: new Date(gen.createdAt).toISOString().split("T")[0],
      source_url: "",
    };
    setSelectedPrompt(fakePrompt);
  };

  return (
    <div
      className={cn("flex h-screen overflow-hidden animated-gradient")}
    >
      {/* Sidebar — always visible */}
      <Sidebar
        activeCategory={activeCategory}
        currentView={currentView}
        onCategoryChange={setActiveCategory}
        onGetStarted={() => setAuthOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onHome={() => setCurrentView("home")}
        onHistory={() => setCurrentView("history")}
        onFavorites={() => setCurrentView("favorites")}
      />

      {/* History View — replaces main content */}
      {currentView === "history" && (
        <div className="flex-1">
          <HistoryPage
            onBack={() => setCurrentView("home")}
            historyPrompts={history.historyPrompts}
            onClearHistory={history.clearHistory}
            onSelectPrompt={handleSelectPrompt}
            generations={genHistory.generations}
            onClearGenerations={genHistory.clearGenerations}
            onSelectGeneration={handleSelectGeneration}
          />
        </div>
      )}

      {/* Favorites View */}
      {currentView === "favorites" && (
        <div className="flex-1">
          <FavoritesPage
            onBack={() => setCurrentView("home")}
            favoritePrompts={favorites.favoritePrompts}
            onToggleFavorite={favorites.toggleFavorite}
            onSelectPrompt={handleSelectPrompt}
          />
        </div>
      )}

      {/* Home View — Main Content */}
      {currentView === "home" && (
      <main className="flex-1 flex flex-col mt-4 ml-4 mr-4 bg-card rounded-t-2xl shadow-sm overflow-hidden min-h-0">
        {/* Header Tabs */}
        <HeaderTabs
          activeModel={activeModel}
          activeSort={activeSort}
          onModelChange={setActiveModel}
          onSortChange={setActiveSort}
          onSearch={() => setSearchOpen(true)}
        />

        {/* Gallery — scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-3 pb-20"
          onScroll={handleScroll}
        >
          <MasonryGallery
            images={filteredImages}
            onImageClick={handleSelectPrompt}
            columns={generateOpen ? 2 : undefined}
          />
        </div>
      </main>
      )}

      {/* Generate Panel — right sidebar */}
      <GeneratePanel
        open={generateOpen}
        mode={generateMode}
        prompt={generatePrompt}
        onClose={() => {
          setGenerateOpen(false);
          setGenerateMode(null);
          setGeneratePrompt(null);
        }}
        onGenerationStart={handleGenerationStart}
        onGenerationProgress={handleGenerationProgress}
        onGenerationComplete={handleGenerationComplete}
        onNavigateHistory={() => setCurrentView("history")}
      />

      {/* Floating Bottom Bar — hidden when detail panel is open */}
      {!selectedPrompt && (
        <FloatingBottomBar
          generateOpen={generateOpen}
          activeView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setSelectedPrompt(null);
          }}
          onToggleGenerate={() => {
            setGenerateOpen((prev) => !prev);
            if (!generateOpen) {
              setGenerateMode("prompt");
            }
          }}
        />
      )}

      {/* Prompt Detail Panel */}
      <PromptDetailPanel
        prompt={selectedPrompt}
        onClose={() => setSelectedPrompt(null)}
        onUseAsPrompt={handleUseAsPrompt}
        onUseAsRef={handleUseAsRef}
        isFavorite={selectedPrompt ? favorites.isFavorite(selectedPrompt.id) : false}
        onToggleFavorite={favorites.toggleFavorite}
      />

      {/* Auth Dialog */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Search Dialog */}
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectPrompt={handleSelectPrompt}
      />
    </div>
  );
}
