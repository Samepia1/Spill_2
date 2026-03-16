"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type MediaItem = {
  id: string;
  publicUrl: string;
  mediaType: "image" | "video";
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
};

type MediaCarouselProps = {
  items: MediaItem[];
};

function PlayButton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50">
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="ml-1 h-7 w-7"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

function VideoSlide({
  item,
  isActive,
}: {
  item: MediaItem;
  isActive: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  // Stop video when swiped away
  useEffect(() => {
    if (!isActive) setPlaying(false);
  }, [isActive]);

  if (playing) {
    return (
      <video
        src={item.publicUrl}
        controls
        autoPlay
        playsInline
        className="h-full w-full object-contain"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="relative h-full w-full"
      aria-label="Play video"
    >
      {item.thumbnailUrl ? (
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-neutral-800" />
      )}
      <PlayButton />
    </button>
  );
}

export default function MediaCarousel({ items }: MediaCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const single = items.length <= 1;

  const setSlideRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      slideRefs.current[index] = el;
    },
    [],
  );

  useEffect(() => {
    if (single) return;

    const container = scrollRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = slideRefs.current.indexOf(
              entry.target as HTMLDivElement,
            );
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.5,
      },
    );

    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }

    return () => observer.disconnect();
  }, [items.length, single]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={scrollRef}
        className={`relative flex ${single ? "" : "snap-x snap-mandatory"} overflow-x-auto overflow-y-hidden rounded-lg bg-black max-h-[400px] [&::-webkit-scrollbar]:hidden`}
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={setSlideRef(i)}
            className={`min-w-full ${single ? "" : "snap-start"} flex items-center justify-center max-h-[400px]`}
          >
            {item.mediaType === "image" ? (
              <img
                src={item.publicUrl}
                alt=""
                loading="lazy"
                className="max-h-[400px] w-full object-contain"
              />
            ) : (
              <VideoSlide item={item} isActive={i === activeIndex} />
            )}
          </div>
        ))}
      </div>

      {!single && (
        <div className="flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <span
              key={item.id}
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                i === activeIndex
                  ? "bg-neutral-800 dark:bg-neutral-200"
                  : "bg-neutral-300 dark:bg-neutral-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
