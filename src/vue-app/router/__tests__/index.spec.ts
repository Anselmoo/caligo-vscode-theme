import { beforeEach, describe, expect, it, vi } from "vitest";

type RouterConfig = {
  routes: Array<{ name?: string; path: string; component?: () => Promise<unknown> }>;
  scrollBehavior: (
    to: unknown,
    from: unknown,
    savedPosition: { left: number; top: number } | null
  ) => { left: number; top: number } | { top: number };
};

type GuardTo = {
  meta: {
    title?: string;
    description?: string;
  };
};

const { createWebHashHistoryMock, createRouterMock, mockRouter, state } = vi.hoisted(() => {
  const hoistedState: {
    capturedConfig: RouterConfig | null;
    registeredGuard: ((to: GuardTo, from: unknown, next: () => void) => void) | null;
  } = {
    capturedConfig: null,
    registeredGuard: null,
  };

  const hoistedMockRouter = {
    beforeEach: vi.fn((guard: (to: GuardTo, from: unknown, next: () => void) => void) => {
      hoistedState.registeredGuard = guard;
    }),
  };

  const hoistedCreateRouterMock = vi.fn((config: RouterConfig) => {
    hoistedState.capturedConfig = config;
    return hoistedMockRouter;
  });

  const hoistedCreateWebHashHistoryMock = vi.fn(() => ({ historyType: "hash" }));

  return {
    createWebHashHistoryMock: hoistedCreateWebHashHistoryMock,
    createRouterMock: hoistedCreateRouterMock,
    mockRouter: hoistedMockRouter,
    state: hoistedState,
  };
});

vi.mock("vue-router", () => ({
  createRouter: createRouterMock,
  createWebHashHistory: createWebHashHistoryMock,
}));

import router from "../index";

describe("router/index", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="initial">';
    document.title = "Initial";
  });

  it("creates router with expected routes and hash history", () => {
    expect(router).toBe(mockRouter);
    expect(createWebHashHistoryMock).toHaveBeenCalledTimes(1);
    expect(createRouterMock).toHaveBeenCalledTimes(1);

    expect(state.capturedConfig).not.toBeNull();
    const routeNames = (state.capturedConfig?.routes ?? []).map(route => route.name);
    expect(routeNames).toEqual([
      "home",
      "gallery",
      "analysis",
      "export",
      "wallpapers",
      "wallpapers-composer",
      "not-found",
    ]);
  });

  it("resolves all lazy route components", async () => {
    const routes = state.capturedConfig?.routes ?? [];
    const lazyComponents = routes
      .map(route => route.component)
      .filter((component): component is () => Promise<unknown> => typeof component === "function");

    const loaded = await Promise.all(lazyComponents.map(component => component()));
    expect(loaded).toHaveLength(7);
  });

  it("uses saved scroll position and defaults to top when absent", () => {
    expect(state.capturedConfig).not.toBeNull();
    const savedPosition = { left: 15, top: 40 };

    expect(state.capturedConfig?.scrollBehavior({}, {}, savedPosition)).toEqual(savedPosition);
    expect(state.capturedConfig?.scrollBehavior({}, {}, null)).toEqual({ top: 0 });
  });

  it("updates title and meta description in the global beforeEach guard", () => {
    expect(mockRouter.beforeEach).toHaveBeenCalledTimes(1);
    expect(state.registeredGuard).not.toBeNull();

    const next = vi.fn();

    state.registeredGuard?.(
      {
        meta: {
          title: "Export — Caligo Themes",
          description: "Export current Caligo colors in standards-based formats",
        },
      },
      {},
      next
    );

    expect(document.title).toBe("Export — Caligo Themes");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Export current Caligo colors in standards-based formats"
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("still calls next when description is missing", () => {
    document.head.innerHTML = "";
    const next = vi.fn();

    state.registeredGuard?.(
      {
        meta: {
          title: "Gallery — Caligo Themes",
        },
      },
      {},
      next
    );

    expect(document.title).toBe("Gallery — Caligo Themes");
    expect(next).toHaveBeenCalledOnce();
  });
});
