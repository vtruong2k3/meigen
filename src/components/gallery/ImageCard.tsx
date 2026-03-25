"use client";

import { cn } from "@/lib/utils";
import type { TrendingPrompt } from "@/types";
import { formatViews, formatRelativeDate } from "@/lib/mock-data";
import { Heart, BarChart3, RefreshCw } from "lucide-react";
import { XIcon, ThreadsIcon } from "@/components/common/icons";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";

interface ImageCardProps {
  prompt: TrendingPrompt;
  onClick: () => void;
  priority?: boolean;
}

export function ImageCard({ prompt, onClick, priority = false }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(!prompt.image);
  const [imgLoaded, setImgLoaded] = useState(false);

  // -- Virtualization State --
  const [inView, setInView] = useState(true);
  const [lockedHeight, setLockedHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent SSR errors where IntersectionObserver is undefined
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setInView(true);
        } else {
          // Lock height before unmounting contents to prevent Masonry layout collapse
          if (containerRef.current) {
            setLockedHeight(containerRef.current.getBoundingClientRect().height);
          }
          setInView(false);
        }
      },
      { 
        rootMargin: "1500px 0px 1500px 0px" // Keep in DOM within 1500px above/below viewport
      }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: !inView && lockedHeight ? `${lockedHeight}px` : "auto" }}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer mb-3 transition-all duration-300",
        !inView && "bg-muted" // Subtle placeholder background
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/meigen-image-url", prompt.image);
        e.dataTransfer.effectAllowed = "copy";
      }}
      suppressHydrationWarning
    >
      {inView ? (
        <>
          {/* Image */}
      <div className="relative w-full" suppressHydrationWarning>
        {/* Skeleton placeholder */}
        {!imgLoaded && !imgError && (
          <div
            className="w-full bg-muted rounded-xl animate-pulse"
            style={{ aspectRatio: "3/4" }}
            suppressHydrationWarning
          >
            <div className="w-full h-full flex items-center justify-center" suppressHydrationWarning>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/20">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        )}
        {!imgError ? (
          <Image
            src={prompt.image}
            alt={`AI prompt by ${prompt.author_name}`}
            width={600}
            height={800}
            priority={priority}
            className={cn(
              "w-full h-auto object-cover rounded-xl transition-all duration-300 ease-out group-hover:scale-105",
              !imgLoaded && "absolute inset-0 opacity-0"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full bg-linear-to-br from-muted to-muted/80 rounded-xl" style={{ aspectRatio: "3/4" }}>
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-muted-foreground text-center text-[11px]">Image unavailable</span>
            </div>
          </div>
        )}
      </div>

      {/* Multi-image badge */}
      {prompt.images.length > 1 && (
        <div className="absolute top-2 right-2" suppressHydrationWarning>
          <span className="px-1.5 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium rounded-md">
            +{prompt.images.length - 1}
          </span>
        </div>
      )}

      {/* Hover Overlay — ALL content at BOTTOM */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl flex flex-col justify-end transition-all duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        suppressHydrationWarning
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20 rounded-xl transition-opacity duration-300" suppressHydrationWarning />
        {/* Bottom gradient overlay */}
        <div className={cn(
          "bg-linear-to-t from-black/60 via-black/30 to-transparent pt-16 pb-3 px-3 rounded-b-xl relative transition-all duration-300 ease-out",
          isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )} suppressHydrationWarning>
          {/* Author row */}
          <div className="flex items-center gap-2 mb-1.5" suppressHydrationWarning>
            <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden" suppressHydrationWarning>
              {prompt.author_name[0]}
            </div>
            <div className="min-w-0" suppressHydrationWarning>
              <p className="text-white text-[12px] font-semibold truncate leading-tight">
                {prompt.author_name}
              </p>
              <p className="text-white/60 text-[10px] truncate leading-tight">
                @{prompt.author}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2.5 text-white/80 text-[11px] mb-2.5" suppressHydrationWarning>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {formatViews(prompt.likes)}
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {formatViews(prompt.views)}
            </span>
            <span>{formatRelativeDate(prompt.date)}</span>
          </div>

          {/* Actions row — Use Idea left, social icons right */}
          <div className="flex items-center justify-between" suppressHydrationWarning>
            <button
              className="flex items-center gap-1.5 py-1.5 px-3 bg-white text-black rounded-lg text-[11px] font-semibold hover:bg-white/90 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Use Idea
            </button>

            <div className="flex items-center gap-1.5" suppressHydrationWarning>
              <button
                className="p-1.5 rounded-lg bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ThreadsIcon />
              </button>
              <a
                href={prompt.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <XIcon />
              </a>
            </div>
          </div>
        </div>
       </div>
      </>
     ) : null}
    </div>
  );
}
