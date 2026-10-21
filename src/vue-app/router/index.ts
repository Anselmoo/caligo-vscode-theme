/**
 * Vue Router Configuration
 * Uses hash mode for GitHub Pages compatibility
 */

import { nextTick } from "vue";
import type { RouteRecordRaw } from "vue-router";
import { createRouter, createWebHashHistory } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import(/* webpackChunkName: "home" */ "../views/HomeView.vue"),
    meta: {
      title: "Caligo — Dark themes for VS Code",
      description: "50 perceptually uniform dark themes built on OKLCH color science",
    },
  },
  {
    path: "/themes",
    name: "themes",
    component: () => import(/* webpackChunkName: "gallery" */ "../views/GalleryView.vue"),
    meta: {
      title: "Themes — Caligo",
      description: "Browse all 50 theme variations with screenshots",
    },
  },
  {
    path: "/science",
    name: "science",
    component: () => import(/* webpackChunkName: "analysis" */ "../views/AnalysisView.vue"),
    meta: {
      title: "Science — Caligo",
      description: "Interactive color science visualizations and WCAG compliance metrics",
    },
  },
  {
    path: "/export",
    name: "export",
    component: () => import(/* webpackChunkName: "export" */ "../views/ExportView.vue"),
    meta: {
      title: "Export — Caligo",
      description: "Export current Caligo colors in standards-based formats",
    },
  },
  {
    path: "/wallpapers",
    name: "wallpapers",
    component: () => import(/* webpackChunkName: "wallpapers" */ "../views/WallpapersView.vue"),
    meta: {
      title: "Wallpapers — Caligo",
      description: "50 unique wallpapers for monitor, tablet, and mobile",
    },
  },
  // Pre-2026 URLs keep working.
  { path: "/gallery", redirect: "/themes" },
  { path: "/analysis", redirect: "/science" },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import(/* webpackChunkName: "not-found" */ "../views/NotFoundView.vue"),
    meta: {
      title: "Page not found — Caligo",
      description: "The page you are looking for does not exist",
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// Update document title on route change
router.beforeEach(to => {
  document.title = typeof to.meta.title === "string" ? to.meta.title : "Caligo";

  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && to.meta.description) {
    metaDescription.setAttribute("content", String(to.meta.description));
  }
  // Returning nothing lets the navigation proceed (Vue Router 5 deprecates next()).
});

// Page changes run inside a View Transition: the browser snapshots the old page,
// Vue renders the new one, and the two cross-fade on the compositor. Browsers
// without the API (or users asking for reduced motion) get an instant swap.
let finishViewTransition: (() => void) | undefined;

/** An interrupted transition rejects `ready`/`finished`; that is expected, not an error. */
function ignoreSkippedTransition(transition: ViewTransition) {
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

router.beforeResolve((to, from) => {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduceMotion || to.path === from.path) return;
  // A navigation that interrupts a running transition settles the old one first.
  finishViewTransition?.();
  return new Promise<void>(proceed => {
    const transition = document.startViewTransition(
      () =>
        new Promise<void>(rendered => {
          finishViewTransition = rendered;
          proceed();
        })
    );
    ignoreSkippedTransition(transition);
  });
});

router.afterEach(async () => {
  await nextTick();
  finishViewTransition?.();
  finishViewTransition = undefined;
});

router.onError(() => {
  finishViewTransition?.();
  finishViewTransition = undefined;
});

export default router;
