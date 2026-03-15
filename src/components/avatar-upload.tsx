"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/settings/actions";
import Avatar from "@/components/avatar";
import { compressImage } from "@/lib/compress-image";

type AvatarUploadProps = {
  userId: string;
  currentAvatarUrl: string | null;
  size?: "md" | "lg";
};

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  size = "lg",
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    setUploading(true);

    try {
      const compressed = await compressImage(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });

      if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Add cache-busting param
      const url = `${publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrl(url);
      if (result?.error) {
        alert("Failed to save avatar: " + result.error);
        return;
      }

      setAvatarUrl(url);
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="group relative cursor-pointer active:opacity-80 disabled:cursor-wait"
      >
        <Avatar src={avatarUrl} alt="Your avatar" size={size} />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
          <CameraIcon className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
