"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ScrollToComment() {
  const searchParams = useSearchParams();
  const commentId = searchParams.get("comment");

  useEffect(() => {
    if (!commentId) return;
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${commentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [commentId]);

  return null;
}
