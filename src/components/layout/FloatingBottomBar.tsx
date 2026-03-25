"use client";

import { cn } from "@/lib/utils";
import {
  Home,
  History,
  Heart,
  Clapperboard,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import type { AppView } from "@/types";

interface NavItem {
  icon: typeof Home;
  label: string;
  view?: AppView;
  action?: string;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", view: "home" },
  { icon: History, label: "History", view: "history" },
  { icon: Heart, label: "Favorites", view: "favorites" },
  { icon: Clapperboard, label: "Generate Video" },
  { icon: Wand2, label: "Generate Image", action: "generate" },
];

interface FloatingBottomBarProps {
  generateOpen?: boolean;
  activeView?: AppView;
  onNavigate?: (view: AppView) => void;
  onToggleGenerate?: () => void;
}

export function FloatingBottomBar({
  generateOpen,
  activeView = "home",
  onNavigate,
  onToggleGenerate,
}: FloatingBottomBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleClick = (item: NavItem) => {
    if (item.action === "generate") {
      onToggleGenerate?.();
    } else if (item.view) {
      onNavigate?.(item.view);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.action === "generate") return generateOpen;
    if (item.view) return item.view === activeView && !generateOpen;
    return false;
  };

  return (
    <div className={cn(
      "fixed bottom-5 z-50 -translate-x-1/2",
      generateOpen
        ? "left-[calc(50%-40px)]"
        : "left-1/2 md:left-[calc(50%+130px)]"
    )} suppressHydrationWarning>
      <div className="relative flex items-center gap-6 px-5 py-2.5 bg-card/80 dark:bg-card/80 backdrop-blur-xl rounded-full shadow-xl border border-border/30" suppressHydrationWarning>
        {navItems.map((item, index) => (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            suppressHydrationWarning
          >
            {/* Tooltip */}
            <div
              suppressHydrationWarning
              className={cn(
                "absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-foreground text-background text-[11px] font-medium rounded-md whitespace-nowrap pointer-events-none transition-all duration-200",
                hoveredIndex === index
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-1"
              )}
            >
              {item.label}
              {/* Arrow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" suppressHydrationWarning />
            </div>

            {/* Icon button */}
            <button
              onClick={() => handleClick(item)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                isActive(item)
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-[20px] h-[20px]" strokeWidth={isActive(item) ? 2 : 1.6} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
