/**
 * Unit tests for rasterize-svg.
 *
 * jsdom implements neither canvas rasterisation nor object URLs, so the browser
 * primitives are stubbed. The contracts worth pinning down are the ones the
 * wallpaper download depends on: the PNG comes out at the requested resolution,
 * every failure mode surfaces as a distinct error, and object URLs are always
 * revoked — including on the failure paths.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rasterizeSvgToPng, triggerDownload } from "../rasterize-svg.js";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="4"></svg>';

let createdUrls: string[];
let revokedUrls: string[];
/** Whether the stubbed Image should succeed or fail to decode. */
let imageShouldLoad: boolean;

function stubObjectUrls() {
  createdUrls = [];
  revokedUrls = [];
  let n = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      n += 1;
      const url = `blob:mock/${n}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => {
      revokedUrls.push(url);
    }),
  });
}

function stubImage() {
  imageShouldLoad = true;
  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = "";
    #src = "";
    set src(value: string) {
      this.#src = value;
      // Decode is async in the browser; mirror that so the promise is exercised.
      queueMicrotask(() => {
        if (imageShouldLoad) this.onload?.();
        else this.onerror?.();
      });
    }
    get src() {
      return this.#src;
    }
  }
  vi.stubGlobal("Image", MockImage);
}

/** Stub canvas so getContext/toBlob behave predictably under jsdom. */
function stubCanvas(opts: { context?: boolean; blob?: boolean } = {}) {
  const { context = true, blob = true } = opts;
  const drawImage = vi.fn();
  const ctx = { drawImage } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() =>
    context ? ctx : null) as unknown as HTMLCanvasElement["getContext"]);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(((cb: BlobCallback) => {
    cb(blob ? new Blob(["png-bytes"], { type: "image/png" }) : null);
  }) as unknown as HTMLCanvasElement["toBlob"]);

  return { drawImage };
}

function stubFetch(ok: boolean, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status, text: async () => SVG }) as unknown as Response)
  );
}

describe("rasterizeSvgToPng", () => {
  beforeEach(() => {
    stubObjectUrls();
    stubImage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns a PNG blob at the requested resolution", async () => {
    const { drawImage } = stubCanvas();
    stubFetch(true);

    const blob = await rasterizeSvgToPng("wallpapers/x/balanced/monitor.svg", 3840, 2160);

    expect(blob.type).toBe("image/png");
    // The SVG declares 8x4; the caller's dimensions must win, otherwise the
    // downloaded wallpaper would not be 4K.
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 3840, 2160);
  });

  it("sizes the canvas backing store to the requested dimensions", async () => {
    stubCanvas();
    stubFetch(true);
    const created: HTMLCanvasElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "canvas") created.push(el as HTMLCanvasElement);
      return el;
    }) as typeof document.createElement);

    await rasterizeSvgToPng("a.svg", 1290, 2796);

    expect(created).toHaveLength(1);
    expect(created[0].width).toBe(1290);
    expect(created[0].height).toBe(2796);
  });

  it("surfaces the HTTP status when the SVG cannot be fetched", async () => {
    stubCanvas();
    stubFetch(false, 404);

    await expect(rasterizeSvgToPng("missing.svg", 100, 100)).rejects.toThrow(
      "Could not load wallpaper (HTTP 404)"
    );
  });

  it("rejects and revokes the object URL when the SVG fails to decode", async () => {
    stubCanvas();
    stubFetch(true);
    imageShouldLoad = false;

    await expect(rasterizeSvgToPng("broken.svg", 100, 100)).rejects.toThrow(
      "Failed to decode wallpaper SVG"
    );
    // A leaked object URL would pin the blob in memory for the page's lifetime.
    expect(revokedUrls).toEqual(createdUrls);
  });

  it("throws when no 2D context is available", async () => {
    stubCanvas({ context: false });
    stubFetch(true);

    await expect(rasterizeSvgToPng("a.svg", 100, 100)).rejects.toThrow(
      "Canvas 2D context unavailable"
    );
  });

  it("throws when PNG encoding yields no blob", async () => {
    stubCanvas({ blob: false });
    stubFetch(true);

    await expect(rasterizeSvgToPng("a.svg", 100, 100)).rejects.toThrow("PNG encoding failed");
  });

  it("revokes the object URL after a successful render", async () => {
    stubCanvas();
    stubFetch(true);

    await rasterizeSvgToPng("a.svg", 10, 10);

    expect(revokedUrls).toEqual(createdUrls);
  });
});

describe("triggerDownload", () => {
  beforeEach(() => {
    stubObjectUrls();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves the blob under the given filename and cleans up", () => {
    const clicked: HTMLAnchorElement[] = [];
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const el = realCreate(tag);
      if (tag === "a") {
        vi.spyOn(el as HTMLAnchorElement, "click").mockImplementation(() => {
          clicked.push(el as HTMLAnchorElement);
        });
      }
      return el;
    }) as typeof document.createElement);

    triggerDownload(new Blob(["x"], { type: "image/png" }), "caligo-AuroraNoir-none-monitor.png");

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe("caligo-AuroraNoir-none-monitor.png");
    expect(clicked[0].href).toContain("blob:mock/");
    // The anchor must not be left in the document.
    expect(document.querySelector("a[download]")).toBeNull();

    // Revocation is deferred so the download has started.
    expect(revokedUrls).toEqual([]);
    vi.runAllTimers();
    expect(revokedUrls).toEqual(createdUrls);
  });
});
