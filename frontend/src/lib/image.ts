// Phone photos are often 4000px+ and several MB. Claude reads images up to
// ~1568px on the long edge anyway, so downscale and re-encode as JPEG before
// upload: faster on mobile data, fewer tokens, and well under the backend limit.
const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

export type PreparedImage = { base64: string; mediaType: "image/jpeg" };

export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunne ikke behandle bildet.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mediaType: "image/jpeg" };
}
