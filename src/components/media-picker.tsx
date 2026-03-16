"use client";

import { useRef } from "react";
import type { MediaFile } from "@/hooks/use-media-upload";

type MediaPickerProps = {
  mediaFiles: MediaFile[];
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  error: string | null;
  maxFiles?: number;
};

const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-400 dark:text-zinc-500"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white drop-shadow-md"
    >
      <circle cx="12" cy="12" r="11" fill="rgba(0,0,0,0.4)" stroke="white" strokeWidth="1.5" />
      <polygon points="10,8 16,12 10,16" fill="white" />
    </svg>
  );
}

function Spinner() {
  return (
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
  );
}

export default function MediaPicker({
  mediaFiles,
  onAddFiles,
  onRemoveFile,
  error,
  maxFiles = 10,
}: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const atMax = mediaFiles.length >= maxFiles;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Thumbnail grid */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {mediaFiles.map((file) => (
            <div
              key={file.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
            >
              {/* Preview */}
              {file.type === "video" ? (
                file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt="Video thumbnail"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-200 dark:bg-zinc-700" />
                )
              ) : (
                file.previewUrl && (
                  <img
                    src={file.previewUrl}
                    alt="Photo preview"
                    className="h-full w-full object-cover"
                  />
                )
              )}

              {/* Play icon overlay for videos */}
              {file.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <PlayIcon />
                </div>
              )}

              {/* Uploading overlay */}
              {file.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Spinner />
                </div>
              )}

              {/* Error overlay */}
              {file.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                  <span className="text-lg font-bold text-white drop-shadow-md">!</span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs font-bold text-white active:scale-90 active:opacity-70"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add media area */}
      {mediaFiles.length === 0 ? (
        <button
          type="button"
          onClick={openFilePicker}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-600 active:scale-[0.98] active:opacity-70"
        >
          <CameraIcon />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Add photos or videos
          </span>
        </button>
      ) : atMax ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          {maxFiles}/{maxFiles}
        </p>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          className="text-sm text-blue-500 dark:text-blue-400 active:opacity-70"
        >
          Add more ({mediaFiles.length}/{maxFiles})
        </button>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
