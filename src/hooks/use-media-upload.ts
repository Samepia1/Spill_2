"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressPostImage } from "@/lib/compress-image";
import { captureVideoThumbnail, getVideoDimensions } from "@/lib/video-thumbnail";

export type MediaFile = {
  id: string;
  file: File;
  type: "image" | "video";
  previewUrl: string;
  thumbnailUrl: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  thumbnailStoragePath: string | null;
  thumbnailPublicUrl: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error: string | null;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  displayOrder: number;
  mimeType: string;
};

const MAX_FILES = 10;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 30; // seconds
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const BUCKET = "post-media";

function getFileExtension(file: File): string {
  const name = file.name;
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex >= 0) {
    return name.slice(dotIndex + 1).toLowerCase();
  }
  return "mp4";
}

function classifyFile(mimeType: string): "image" | "video" | null {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  return null;
}

export function useMediaUpload(userId: string, tempPostId: string) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const processingRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  const updateFile = useCallback((id: string, updates: Partial<MediaFile>) => {
    setMediaFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const processFile = useCallback(
    async (mediaFile: MediaFile) => {
      const supabase = supabaseRef.current;

      updateFile(mediaFile.id, { status: "uploading" });

      try {
        if (mediaFile.type === "image") {
          const { file: compressed, width, height } = await compressPostImage(mediaFile.file);
          const storagePath = `${userId}/${tempPostId}/${mediaFile.displayOrder}_${mediaFile.id}.jpg`;

          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, compressed, { upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

          updateFile(mediaFile.id, {
            status: "done",
            storagePath,
            publicUrl: urlData.publicUrl,
            thumbnailUrl: mediaFile.previewUrl,
            width,
            height,
            fileSizeBytes: compressed.size,
          });
        } else {
          // Video
          const dims = await getVideoDimensions(mediaFile.file);

          if (dims && dims.duration > MAX_VIDEO_DURATION) {
            updateFile(mediaFile.id, {
              status: "error",
              error: "Video must be under 30 seconds",
            });
            return;
          }

          const ext = getFileExtension(mediaFile.file);
          const storagePath = `${userId}/${tempPostId}/${mediaFile.displayOrder}_${mediaFile.id}.${ext}`;
          const thumbPath = `${userId}/${tempPostId}/${mediaFile.displayOrder}_${mediaFile.id}_thumb.jpg`;

          // Upload video and capture thumbnail in parallel
          const [uploadResult, thumbnail] = await Promise.all([
            supabase.storage
              .from(BUCKET)
              .upload(storagePath, mediaFile.file, { upsert: false }),
            captureVideoThumbnail(mediaFile.file),
          ]);

          if (uploadResult.error) throw new Error(uploadResult.error.message);

          const { data: videoUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(storagePath);

          let thumbnailStoragePath: string | null = null;
          let thumbnailPublicUrl: string | null = null;

          if (thumbnail) {
            const { error: thumbErr } = await supabase.storage
              .from(BUCKET)
              .upload(thumbPath, thumbnail, { upsert: false });

            if (!thumbErr) {
              thumbnailStoragePath = thumbPath;
              const { data: thumbUrlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(thumbPath);
              thumbnailPublicUrl = thumbUrlData.publicUrl;
            }
          }

          updateFile(mediaFile.id, {
            status: "done",
            storagePath,
            publicUrl: videoUrlData.publicUrl,
            thumbnailStoragePath,
            thumbnailPublicUrl,
            thumbnailUrl: thumbnailPublicUrl,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        updateFile(mediaFile.id, { status: "error", error: message });
      }
    },
    [userId, tempPostId, updateFile]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const fileId = queueRef.current.shift()!;

      // Get the current file from state — need a snapshot
      const file = await new Promise<MediaFile | undefined>((resolve) => {
        setMediaFiles((prev) => {
          resolve(prev.find((f) => f.id === fileId));
          return prev;
        });
      });

      if (file && file.status === "pending") {
        await processFile(file);
      }
    }

    processingRef.current = false;
  }, [processFile]);

  const addFiles = useCallback(
    (files: FileList) => {
      setError(null);

      const currentCount = mediaFiles.length;
      const incoming = Array.from(files);

      if (currentCount + incoming.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      const newFiles: MediaFile[] = [];
      let nextOrder = currentCount;

      for (const file of incoming) {
        const fileType = classifyFile(file.type);

        if (!fileType) {
          setError(`Unsupported file type: ${file.type || file.name}`);
          return;
        }

        if (fileType === "image" && file.size > MAX_IMAGE_SIZE) {
          setError("Image must be under 10MB");
          return;
        }

        if (fileType === "video" && file.size > MAX_VIDEO_SIZE) {
          setError("Video must be under 50MB");
          return;
        }

        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        newFiles.push({
          id,
          file,
          type: fileType,
          previewUrl,
          thumbnailUrl: fileType === "image" ? previewUrl : null,
          storagePath: null,
          publicUrl: null,
          thumbnailStoragePath: null,
          thumbnailPublicUrl: null,
          status: "pending",
          error: null,
          fileSizeBytes: file.size,
          width: null,
          height: null,
          displayOrder: nextOrder++,
          mimeType: file.type,
        });
      }

      setMediaFiles((prev) => [...prev, ...newFiles]);

      // Queue new files for sequential processing
      const newIds = newFiles.map((f) => f.id);
      queueRef.current.push(...newIds);
      processQueue();
    },
    [mediaFiles.length, processQueue]
  );

  const removeFile = useCallback(
    (id: string) => {
      const file = mediaFiles.find((f) => f.id === id);
      if (!file) return;

      // Fire-and-forget storage cleanup
      const supabase = supabaseRef.current;
      if (file.storagePath) {
        supabase.storage.from(BUCKET).remove([file.storagePath]);
      }
      if (file.thumbnailStoragePath) {
        supabase.storage.from(BUCKET).remove([file.thumbnailStoragePath]);
      }

      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(file.previewUrl);

      // Remove from state and re-index displayOrder
      setMediaFiles((prev) => {
        const filtered = prev.filter((f) => f.id !== id);
        return filtered.map((f, i) => ({ ...f, displayOrder: i }));
      });
    },
    [mediaFiles]
  );

  const isUploading = mediaFiles.some(
    (f) => f.status === "pending" || f.status === "uploading"
  );

  const totalCount = mediaFiles.length;

  return {
    mediaFiles,
    addFiles,
    removeFile,
    isUploading,
    totalCount,
    error,
  };
}
