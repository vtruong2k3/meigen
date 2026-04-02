"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import type { CategoryItem } from "@/components/layout/Sidebar";
import { HeaderTabs } from "@/components/layout/HeaderTabs";
import type { ModelTab } from "@/components/layout/HeaderTabs";
import { FloatingBottomBar } from "@/components/layout/FloatingBottomBar";
import { MasonryGallery } from "@/components/gallery/MasonryGallery";
import { PromptDetailPanel } from "@/components/prompt/PromptDetailPanel";
import { GeneratePanel } from "@/components/generate/GeneratePanel";
import { SearchDialog } from "@/components/search/SearchDialog";
import { HistoryPage } from "@/components/history/HistoryPage";
import { FavoritesPage } from "@/components/favorites/FavoritesPage";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { useGenerationHistory } from "@/hooks/use-generation-history";
import { useTrending, useTrendingMeta } from "@/hooks/use-trending";
import type {
  TrendingPrompt,
  AppView,
  GenerateMode,
  GenerateParams,
  GenerationHistoryItem,
} from "@/types";
import type { TrendingPromptBE } from "@/services/trending.service";

// ── Static sort options (purely UI, no backend dependency) ───────────────────
const SORT_TABS = [
  { id: "featured" as const, label: "Featured" },
  { id: "newest" as const, label: "Newest" },
  { id: "popular" as const, label: "Popular" },
];

// ── Adapters ─────────────────────────────────────────────────────────────────

/** Convert raw BE category string to CategoryItem shape for Sidebar */
function buildCategoryItems(categories: string[]): CategoryItem[] {
  return [
    { id: "all", label: "All" },
    ...categories.map((cat) => ({
      id: cat.toLowerCase().replace(/\s+/g, "-"),
      label: cat,
      categoryValue: cat,
    })),
  ];
}

/** Convert raw BE model string to ModelTab shape for HeaderTabs */
function buildModelTabs(models: string[]): ModelTab[] {
  return [
    { id: "all", label: "All Models" },
    ...models.map((m) => ({
      id: m.toLowerCase().replace(/\s+/g, "-"),
      label: m,
      modelValue: m,
    })),
  ];
}

// ── Adapter: Convert BE prompt to FE TrendingPrompt shape ────────────────────
function adaptBEPrompt(p: TrendingPromptBE): TrendingPrompt {
  return {
    id: p.id,
    rank: p.rank,
    prompt: p.prompt,
    author: p.author,
    author_name: p.author_name,
    likes: p.likes,
    views: p.views,
    image: p.image,
    images: p.images,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: p.model as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: p.categories as any,
    date: p.date,
    source_url: p.source_url ?? "",
  };
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeModel, setActiveModel] = useState("all");
  const [activeSort, setActiveSort] = useState<"featured" | "newest" | "popular">("featured");
  const [selectedPrompt, setSelectedPrompt] = useState<TrendingPrompt | null>(null);

  const [visibleCount, setVisibleCount] = useState(40);
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("home");

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMode, setGenerateMode] = useState<GenerateMode | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState<TrendingPrompt | null>(null);

  // ── Data hooks ────────────────────────────────────────────────────
  const favorites = useFavorites();
  const history = useHistory();
  const genHistory = useGenerationHistory();

  // ── Dynamic filter meta from backend ──────────────────────────────
  const { categories: rawCategories, models: rawModels } = useTrendingMeta();

  const categoryItems = useMemo(() => buildCategoryItems(rawCategories), [rawCategories]);
  const modelTabs = useMemo(() => buildModelTabs(rawModels), [rawModels]);

  // ── Map sort UI → BE sortBy param ──────────────────────────────
  const sortByMap: Record<string, "rank" | "date" | "views"> = {
    featured: "rank",
    newest: "date",
    popular: "views",
  };

  // ── Trending data from Backend ─────────────────────────────────
  const categoryFilter = useMemo(() => {
    if (activeCategory === "all") return undefined;
    const cat = categoryItems.find((c) => c.id === activeCategory);
    return cat?.categoryValue;
  }, [activeCategory, categoryItems]);

  const modelFilter = useMemo(() => {
    if (activeModel === "all") return undefined;
    const m = modelTabs.find((t) => t.id === activeModel);
    return m?.modelValue;
  }, [activeModel, modelTabs]);

  const { prompts: bePrompts, isLoading: trendingLoading } = useTrending({
    page: 1,
    limit: 200, // Load a large set, client-side slice for infinite scroll UX
    category: categoryFilter,
    model: modelFilter,
    sortBy: sortByMap[activeSort] ?? "rank",
    order: activeSort === "newest" ? "desc" : "desc",
  });

  // ── Adapt BE data to FE type ────────────────────────────────────
  const allPrompts = useMemo(() => bePrompts.map(adaptBEPrompt), [bePrompts]);

  // ── Client-side slice for infinite scroll ──────────────────────
  const filteredImages = useMemo(
    () => allPrompts.slice(0, visibleCount),
    [allPrompts, visibleCount]
  );

  // Reset scroll when filters change
  useEffect(() => {
    setVisibleCount(40);
  }, [activeCategory, activeModel, activeSort]);

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 500) {
      setVisibleCount((prev) => Math.min(prev + 30, allPrompts.length));
    }
  };

  // ── Generation callbacks ──────────────────────────────────────
  const handleGenerationComplete = useCallback(
    (taskId: string, images: string[], totalTime: number | null) => {
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
    (
      taskId: string,
      prompt: string,
      width: number,
      height: number,
      quality: "sd" | "hd"
    ) => {
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

  // ── Prompt interaction ────────────────────────────────────────
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
    <div className={cn("flex h-screen overflow-hidden animated-gradient")}>
      {/* Sidebar */}
      <Sidebar
        activeCategory={activeCategory}
        currentView={currentView}
        categoryItems={categoryItems}
        onCategoryChange={setActiveCategory}
        onGetStarted={() => setAuthOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onHome={() => setCurrentView("home")}
        onHistory={() => setCurrentView("history")}
        onFavorites={() => setCurrentView("favorites")}
      />

      {/* History View */}
      {currentView === "history" && (
        <div className="flex-1">
          <HistoryPage
            onBack={() => setCurrentView("home")}
            historyPrompts={history.historyPrompts.map(adaptBEPrompt)}
            isLoadingPrompts={history.isLoadingPrompts}
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
            favoritePrompts={favorites.favoritePrompts.map(adaptBEPrompt)}
            isLoadingPrompts={favorites.isLoadingPrompts}
            onToggleFavorite={favorites.toggleFavorite}
            onSelectPrompt={handleSelectPrompt}
          />
        </div>
      )}

      {/* Home View */}
      {currentView === "home" && (
        <main className="flex-1 flex flex-col mt-4 ml-4 mr-4 bg-card rounded-t-2xl shadow-sm overflow-hidden min-h-0">
          <HeaderTabs
            activeModel={activeModel}
            activeSort={activeSort}
            modelTabs={modelTabs}
            onModelChange={setActiveModel}
            onSortChange={(id) => setActiveSort(id as "featured" | "newest" | "popular")}
            onSearch={() => setSearchOpen(true)}
          />

          <div
            className="flex-1 overflow-y-auto px-3 pb-20"
            onScroll={handleScroll}
          >
            {trendingLoading && filteredImages.length === 0 ? (
              // Skeleton loader while first load
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl bg-muted"
                    style={{ height: i % 3 === 0 ? 320 : i % 3 === 1 ? 240 : 280 }}
                  />
                ))}
              </div>
            ) : (
              <MasonryGallery
                images={filteredImages}
                onImageClick={handleSelectPrompt}
                columns={generateOpen ? 2 : undefined}
              />
            )}
          </div>
        </main>
      )}

      {/* Generate Panel */}
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

      {/* Floating Bottom Bar */}
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
            if (!generateOpen) setGenerateMode("prompt");
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
