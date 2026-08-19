/**
 * rasterize-svg — client-side SVG → PNG conversion.
 *
 * Wallpapers ship as SVG because the full 4K PNG set is ~2 GB, far beyond the
 * 1 GB GitHub Pages limit. Rasterising in the browser on demand gives users a
 * genuine native-resolution PNG without storing any of it.
 *
 * The wallpaper SVGs reference no external resources, so the canvas is never
 * tainted and toBlob() is allowed.
 */

/** Load an SVG source string into an HTMLImageElement via an object URL. */
function loadSvgImage(svgText: string): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const revoke = () => {
    URL.revokeObjectURL(url);
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Same-origin object URL, but be explicit so the canvas stays untainted.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      resolve({ img, revoke });
    };
    img.onerror = () => {
      revoke();
      reject(new Error("Failed to decode wallpaper SVG"));
    };
    img.src = url;
  });
}

/**
 * Fetch an SVG and rasterise it to a PNG blob at the given pixel dimensions.
 *
 * @param svgUrl Same-origin URL of the source SVG.
 * @param width  Target width in pixels (e.g. 3840).
 * @param height Target height in pixels (e.g. 2160).
 */
export async function rasterizeSvgToPng(
  svgUrl: string,
  width: number,
  height: number
): Promise<Blob> {
  const res = await fetch(svgUrl);
  if (!res.ok) throw new Error(`Could not load wallpaper (HTTP ${res.status})`);
  const svgText = await res.text();

  const { img, revoke } = await loadSvgImage(svgText);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    // Draw explicitly at target size — the SVG carries its own width/height,
    // but passing dimensions guarantees the intended output resolution.
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("PNG encoding failed"));
      }, "image/png");
    });
  } finally {
    revoke();
  }
}

/** Save a blob to the user's machine under the given filename. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has definitely started.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
