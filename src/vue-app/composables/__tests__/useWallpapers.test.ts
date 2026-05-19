/**
 * Unit tests for useWallpapers composable
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WallpapersManifest } from "../../../../wallpaper/types.js";
import { useWallpapers } from "../useWallpapers";

const mockEntries: WallpapersManifest["entries"] = [
  {
    seedId: "Eclipse",
    seedDisplayName: "Eclipse",
    harmonyMode: "balanced",
    harmonyLabel: "Balanced",
    topic: "Ice fractures",
    platform: "monitor",
    textVariant: "no-text",
    svgPath: "wallpapers/Eclipse/balanced/monitor.svg",
    pngPath: "wallpapers/Eclipse/balanced/monitor.png",
    displayName: "Eclipse — Balanced",
  },
  {
    seedId: "Eclipse",
    seedDisplayName: "Eclipse",
    harmonyMode: "analogous",
    harmonyLabel: "Analogous",
    topic: "Ice fractures",
    platform: "monitor",
    textVariant: "no-text",
    svgPath: "wallpapers/Eclipse/analogous/monitor.svg",
    pngPath: "wallpapers/Eclipse/analogous/monitor.png",
    displayName: "Eclipse — Analogous",
  },
  {
    seedId: "Cinder",
    seedDisplayName: "Cinder",
    harmonyMode: "balanced",
    harmonyLabel: "Balanced",
    topic: "Starfield",
    platform: "monitor",
    textVariant: "no-text",
    svgPath: "wallpapers/Cinder/balanced/monitor.svg",
    pngPath: "wallpapers/Cinder/balanced/monitor.png",
    displayName: "Cinder — Balanced",
  },
  {
    seedId: "Cinder",
    seedDisplayName: "Cinder",
    harmonyMode: "balanced",
    harmonyLabel: "Balanced",
    topic: "Starfield",
    platform: "tablet",
    textVariant: "no-text",
    svgPath: "wallpapers/Cinder/balanced/tablet.svg",
    pngPath: "wallpapers/Cinder/balanced/tablet.png",
    displayName: "Cinder — Balanced",
  },
];

describe("useWallpapers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initialises with empty entries and default filter", () => {
    const { entries, loading, error, filter } = useWallpapers();
    expect(entries.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
    expect(filter.value.platform).toBe("monitor");
    expect(filter.value.textVariant).toBe("no-text");
    expect(filter.value.seedId).toBeNull();
    expect(filter.value.harmonyMode).toBeNull();
  });

  it("loadManifest — populates entries on success", async () => {
    const manifest: WallpapersManifest = { version: 1, entries: mockEntries };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(manifest),
      })
    );

    const { entries, loading, error, loadManifest } = useWallpapers();
    await loadManifest();

    expect(entries.value).toHaveLength(4);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it("loadManifest — sets error on HTTP failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const { error, loadManifest } = useWallpapers();
    await loadManifest();

    expect(error.value).toBe("HTTP 404");
  });

  it("loadManifest — sets error on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const { error, loadManifest } = useWallpapers();
    await loadManifest();

    expect(error.value).toBe("Network error");
  });

  it("loadManifest — skips second call if already loaded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: 1, entries: mockEntries }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { loadManifest } = useWallpapers();
    await loadManifest();
    await loadManifest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allSeeds — returns unique seeds in order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { allSeeds, loadManifest } = useWallpapers();
    await loadManifest();

    expect(allSeeds.value).toHaveLength(2);
    expect(allSeeds.value[0].id).toBe("Eclipse");
    expect(allSeeds.value[1].id).toBe("Cinder");
  });

  it("allModes — returns unique harmony modes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { allModes, loadManifest } = useWallpapers();
    await loadManifest();

    const ids = allModes.value.map(m => m.id);
    expect(ids).toContain("balanced");
    expect(ids).toContain("analogous");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filteredEntries — filters by seedId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { filteredEntries, setFilter, loadManifest } = useWallpapers();
    await loadManifest();

    setFilter({ seedId: "Cinder", platform: null, textVariant: null });
    expect(filteredEntries.value.every(e => e.seedId === "Cinder")).toBe(true);
    expect(filteredEntries.value).toHaveLength(2);
  });

  it("filteredEntries — filters by harmonyMode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { filteredEntries, setFilter, loadManifest } = useWallpapers();
    await loadManifest();

    setFilter({ harmonyMode: "analogous" });
    expect(filteredEntries.value).toHaveLength(1);
    expect(filteredEntries.value[0].seedId).toBe("Eclipse");
  });

  it("filteredEntries — filters by platform", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { filteredEntries, setFilter, loadManifest } = useWallpapers();
    await loadManifest();

    setFilter({ platform: "tablet" });
    expect(filteredEntries.value).toHaveLength(1);
    expect(filteredEntries.value[0].platform).toBe("tablet");
  });

  it("filteredEntries — null filters show all entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: 1, entries: mockEntries }),
      })
    );

    const { filteredEntries, setFilter, loadManifest } = useWallpapers();
    await loadManifest();

    setFilter({ seedId: null, harmonyMode: null, platform: null, textVariant: null });
    expect(filteredEntries.value).toHaveLength(4);
  });

  it("setFilter — merges partial updates", () => {
    const { filter, setFilter } = useWallpapers();
    setFilter({ seedId: "Eclipse" });
    expect(filter.value.seedId).toBe("Eclipse");
    expect(filter.value.platform).toBe("monitor"); // untouched
  });

  it("resetFilter — restores defaults", () => {
    const { filter, setFilter, resetFilter } = useWallpapers();
    setFilter({ seedId: "Cinder", harmonyMode: "triadic", platform: "mobile" });
    resetFilter();
    expect(filter.value.seedId).toBeNull();
    expect(filter.value.harmonyMode).toBeNull();
    expect(filter.value.platform).toBe("monitor");
    expect(filter.value.textVariant).toBe("no-text");
  });
});
