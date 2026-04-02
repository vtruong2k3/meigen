"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { TrendingPrompt } from "@/types";
import { useTrending } from "@/hooks/use-trending";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPrompt?: (prompt: TrendingPrompt) => void;
}

const tabs = ["Posts", "Generations"] as const;

export function SearchDialog({ open, onOpenChange, onSelectPrompt }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Posts");

  // Fetch from BE — pass search term when user types
  const { prompts: rawResults, isLoading } = useTrending({
    page: 1,
    limit: query.trim() ? 20 : 16,
    search: query.trim() || undefined,
    sortBy: "rank",
    order: "desc",
  });

  // Adapt BE prompts to FE TrendingPrompt shape
  const results: TrendingPrompt[] = rawResults.map((p) => ({
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
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[720px] p-0 gap-0 overflow-hidden rounded-2xl max-h-[70vh]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search prompts</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          <Search className="w-6 h-6 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search posts or generations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-xl font-light outline-none placeholder:text-muted-foreground/60 bg-transparent"
            autoFocus
          />
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-6" />

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Results area */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] px-6 pb-5">
          {/* Section header */}
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3 mt-2">
            {query.trim() ? `Results for "${query}"` : "Recent Posts"}
          </p>

          {/* Image grid — 4 columns */}
          <AnimatePresence mode="wait">
            <motion.div
              key={query + activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
            >
              {results.map((prompt) => (
                <motion.button
                  key={prompt.id}
                  onClick={() => {
                    onSelectPrompt?.(prompt);
                    onOpenChange(false);
                  }}
                  className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Image
                    src={prompt.image}
                    alt={prompt.author_name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-xl" />
                </motion.button>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && results.length === 0 && query.trim() && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
