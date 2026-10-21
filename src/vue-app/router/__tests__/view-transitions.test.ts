/**
 * Route changes and View Transitions: the router opens a transition before a
 * navigation resolves and settles it once the new view has rendered, on errors
 * and when a newer navigation interrupts it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

// Every lazy view resolves to a trivial component; only navigation is under test.
const Stub = defineComponent({ render: () => h("div") });
vi.mock("../../views/HomeView.vue", () => ({ default: Stub }));
vi.mock("../../views/GalleryView.vue", () => ({ default: Stub }));
vi.mock("../../views/AnalysisView.vue", () => ({ default: Stub }));
vi.mock("../../views/ExportView.vue", () => ({ default: Stub }));
vi.mock("../../views/WallpapersView.vue", () => ({ default: Stub }));
vi.mock("../../views/NotFoundView.vue", () => ({ default: Stub }));

type Transition = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
};

/** Records each transition's update promise so a test can wait for it to settle. */
function installViewTransition(make?: (done: Promise<void>) => Partial<Transition>) {
  const updates: Promise<void>[] = [];
  const start = vi.fn((update: () => Promise<void>): Transition => {
    const done = update();
    updates.push(done);
    return {
      ready: Promise.resolve(),
      finished: done,
      updateCallbackDone: done,
      ...make?.(done),
    };
  });
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  return { start, updates };
}

async function freshRouter() {
  vi.resetModules();
  const { default: router } = await import("../index");
  await router.push("/");
  return router;
}

describe("router view transitions", () => {
  beforeEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "startViewTransition");
    vi.unstubAllGlobals();
  });

  it("wraps a page change in one transition and settles it after rendering", async () => {
    const router = await freshRouter();
    const { start, updates } = installViewTransition();

    await router.push("/themes");

    expect(start).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe("/themes");
    await expect(updates[0]).resolves.toBeUndefined();
  });

  it("navigates without a transition when the API is missing", async () => {
    const router = await freshRouter();

    await router.push("/science");

    expect(router.currentRoute.value.path).toBe("/science");
  });

  it("navigates without a transition when reduced motion is requested", async () => {
    const router = await freshRouter();
    const { start } = installViewTransition();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true } as MediaQueryList));

    await router.push("/wallpapers");

    expect(start).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/wallpapers");
  });

  it("does not animate a change that keeps the same path", async () => {
    const router = await freshRouter();
    await router.push("/themes");
    const { start } = installViewTransition();

    await router.push({ path: "/themes", query: { mode: "triadic" } });

    expect(start).not.toHaveBeenCalled();
  });

  it("lets the newest navigation win and leaves no transition pending", async () => {
    const router = await freshRouter();
    const { start, updates } = installViewTransition();

    // The second push supersedes the first; how many transitions start depends on
    // where the first navigation was, but none may be left waiting.
    const first = router.push("/themes");
    const second = router.push("/science");
    await Promise.allSettled([first, second]);

    expect(start).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/science");
    await expect(Promise.all(updates)).resolves.toBeDefined();
  });

  it("settles the transition when navigation fails", async () => {
    const router = await freshRouter();
    const { updates } = installViewTransition();
    const removeGuard = router.afterEach(() => {});
    const failing = router.beforeResolve(to => {
      if (to.path === "/export") throw new Error("guard failed");
    });

    await expect(router.push("/export")).rejects.toThrow("guard failed");

    await expect(Promise.all(updates)).resolves.toBeDefined();
    failing();
    removeGuard();
  });

  it("swallows the rejections of a skipped transition", async () => {
    const router = await freshRouter();
    installViewTransition(() => {
      const skipped = () =>
        Promise.reject(new DOMException("Transition was skipped", "AbortError"));
      return { ready: skipped(), finished: skipped() };
    });

    await router.push("/themes");
    // An unhandled rejection would fail the test run.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(router.currentRoute.value.path).toBe("/themes");
  });
});
