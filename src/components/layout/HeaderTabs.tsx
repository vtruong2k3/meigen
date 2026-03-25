"use client";

import { cn } from "@/lib/utils";
import { modelTabs, sortTabs } from "@/lib/mock-data";
import { GoogleGIcon } from "@/components/common/icons";
import { Search } from "lucide-react";

interface HeaderTabsProps {
  activeModel: string;
  activeSort: string;
  onModelChange: (id: string) => void;
  onSortChange: (id: string) => void;
  onSearch?: () => void;
}

/* Small SVG brand icons for model tabs */
function ModelIcon({ modelId }: { modelId: string }) {
  if (modelId === "nanobanana") {
    return <GoogleGIcon size={14} />;
  }
  if (modelId === "gptimage") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M12 6.5a1 1 0 0 1 1 1v3.5H16.5a1 1 0 1 1 0 2H13v3.5a1 1 0 1 1-2 0V13H7.5a1 1 0 1 1 0-2H11V7.5a1 1 0 0 1 1-1z" fill="white"/>
      </svg>
    );
  }
  if (modelId === "midjourney") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
        <path d="M12 2L4 14h16L12 2zm0 3.5L16.5 13h-9L12 5.5zM4 16h16v2H4v-2z" fill="currentColor"/>
      </svg>
    );
  }
  return null;
}

export function HeaderTabs({
  activeModel,
  activeSort,
  onModelChange,
  onSortChange,
  onSearch,
}: HeaderTabsProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-2 gap-4">
        {/* Model Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {modelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onModelChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200 outline-none",
                activeModel === tab.id
                  ? "bg-card dark:bg-secondary border border-border/80 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50 dark:hover:bg-secondary/50 border border-transparent"
              )}
            >
              <ModelIcon modelId={tab.id} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + Sort section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search button */}
          {onSearch && (
            <button
              onClick={onSearch}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-0.5">
            {sortTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSortChange(tab.id)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-all duration-200",
                  activeSort === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
