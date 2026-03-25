"use client";

import { useState, useEffect } from "react";
import type { TrendingPrompt } from "@/types";
import { ImageCard } from "./ImageCard";
import Masonry from "react-masonry-css";

interface MasonryGalleryProps {
  images: TrendingPrompt[];
  onImageClick: (image: TrendingPrompt) => void;
  columns?: number;
}

export function MasonryGallery({ images, onImageClick, columns: columnsProp }: MasonryGalleryProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const breakpointColumns = columnsProp
    ? columnsProp
    : {
        default: 4,
        1280: 3,
        1024: 3,
        640: 2,
      };

  if (!mounted) {
    // SSR placeholder — avoids hydration mismatch from browser extensions
    return <div className="min-h-[50vh]" />;
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid-column"
    >
      {images.map((prompt, index) => (
        <ImageCard
          key={prompt.id}
          prompt={prompt}
          onClick={() => onImageClick(prompt)}
          priority={index < 8}
        />
      ))}
    </Masonry>
  );
}
