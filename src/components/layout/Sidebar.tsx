"use client";

import { cn } from "@/lib/utils";
import { categoryItems } from "@/lib/mock-data";
import { useTheme } from "next-themes";
import {
  Home,
  Search,
  Clock,
  Heart,
  Hash,
  ChevronDown,
  RefreshCw,
  Gift,
  Sun,
  Moon,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  activeCategory: string;
  currentView: string;
  onCategoryChange: (id: string) => void;
  onGetStarted?: () => void;
  onSearch?: () => void;
  onHome?: () => void;
  onHistory?: () => void;
  onFavorites?: () => void;
}

export function Sidebar({ activeCategory, currentView, onCategoryChange, onGetStarted, onSearch, onHome, onHistory, onFavorites }: SidebarProps) {
  const [tagsOpen, setTagsOpen] = useState(true);
  const { theme, setTheme } = useTheme();

  return (
    <aside className="hidden md:flex flex-col w-[260px] min-w-[260px] h-screen sticky top-0 bg-background overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
              <path d="M12 2L2 12l10 10 10-10L12 2z" fill="currentColor" />
            </svg>
          </div>
          <span
            className="text-xl tracking-wide"
            style={{ fontFamily: 'var(--font-barlow), "Barlow Condensed", sans-serif' }}
          >
            <span className="font-bold">MeiGen</span>{" "}
            <span className="font-normal italic text-muted-foreground">Gallery</span>
          </span>
        </div>
      </div>

      {/* Scrollable middle section */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
      {/* Main Nav */}
      <nav className="px-3 space-y-0.5">
        {[
          { icon: Home, label: "Home", view: "home", onClick: onHome },
          { icon: Search, label: "Search", view: "search", onClick: onSearch },
          { icon: Clock, label: "History", view: "history", onClick: onHistory },
          { icon: Heart, label: "Favorites", view: "favorites", onClick: onFavorites },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              item.view === currentView
                ? "bg-muted-active text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Categories */}
      <div className="px-3 mt-6">
        <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Categories
        </p>

        {/* Tags accordion */}
        <button
          onClick={() => setTagsOpen(!tagsOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Hash className="w-[18px] h-[18px]" />
          <span className="flex-1 text-left">Tags</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              tagsOpen && "rotate-180"
            )}
          />
        </button>

        {tagsOpen && (
          <div className="ml-4 mt-1 space-y-0.5">
            {categoryItems.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg text-sm text-left transition-colors",
                  activeCategory === cat.id
                    ? "bg-muted-active text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Recent Updates */}
        <button className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <RefreshCw className="w-[18px] h-[18px]" />
          <span className="flex-1 text-left">Recent Updates</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      </div>

      {/* Footer links — fixed at bottom */}
      <div className="px-5 py-3 space-y-3">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">DMCA</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Refund</a>
        </div>

        {/* Share card */}
        <div className="p-3 rounded-xl border border-border bg-background hover:bg-muted transition-colors cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Share MeiGen</p>
              <p className="text-xs text-muted-foreground">
                Invite friends, get 200 credits
              </p>
            </div>
            <Gift className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Get Started + Free Credits */}
        <div className="flex items-center gap-2">
          <button
            onClick={onGetStarted}
            className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Get Started
          </button>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Free Credits Daily
          </span>
        </div>
      </div>
    </aside>
  );
}
