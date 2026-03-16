/**
 * Captures the first visible frame of a video file as a JPEG thumbnail.
 * Uses a <video> element + OffscreenCanvas to grab a frame at 0.5s.
 * Returns null if capture fails (e.g. unsupported codec).
 */
export async function captureVideoThumbnail(
  file: File,
  maxWidth = 640
): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    });

    video.addEventListener("loadedmetadata", () => {
      // Seek to 0.5s or halfway if very short
      video.currentTime = Math.min(0.5, video.duration / 2);
    });

    video.addEventListener("seeked", () => {
      clearTimeout(timeout);
      try {
        const scale = Math.min(1, maxWidth / video.videoWidth);
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, w, h);

        canvas
          .convertToBlob({ type: "image/jpeg", quality: 0.7 })
          .then((blob) => {
            cleanup();
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
          })
          .catch(() => {
            cleanup();
            resolve(null);
          });
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.src = url;
  });
}

/**
 * Gets the dimensions and duration of a video file.
 */
export function getVideoDimensions(
  file: File
): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    });

    video.addEventListener("loadedmetadata", () => {
      clearTimeout(timeout);
      const result = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      };
      cleanup();
      resolve(result);
    });

    video.src = url;
  });
}
