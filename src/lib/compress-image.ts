/**
 * Compresses and resizes an image file using the Canvas API.
 * Crops to a center square and resizes to maxSize x maxSize.
 * Returns a JPEG File ready for upload.
 */
export async function compressImage(
  file: File,
  maxSize = 800,
  quality = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  // Crop to center square
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  // Scale down if larger than maxSize
  const outputSize = Math.min(side, maxSize);

  const canvas = new OffscreenCanvas(outputSize, outputSize);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outputSize, outputSize);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}
