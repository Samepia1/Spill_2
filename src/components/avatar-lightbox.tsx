"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Avatar from "@/components/avatar";

type AvatarLightboxProps = {
  src: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export default function AvatarLightbox({
  src,
  alt,
  size = "lg",
}: AvatarLightboxProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Don't make it clickable if there's no image
  if (!src) {
    return <Avatar src={null} alt={alt} size={size} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer active:opacity-80"
      >
        <Avatar src={src} alt={alt} size={size} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
          onClick={close}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Large avatar image */}
          <div
            className="overflow-hidden rounded-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={320}
              height={320}
              className="rounded-full object-cover"
              style={{ width: 320, height: 320 }}
            />
          </div>
        </div>
      )}
    </>
  );
}
