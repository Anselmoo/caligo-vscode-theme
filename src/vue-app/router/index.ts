/**
 * Vue Router Configuration
 * Uses hash mode for GitHub Pages compatibility
 */

import type { RouteRecordRaw } from "vue-router";
import { createRouter, createWebHashHistory } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import(/* webpackChunkName: "home" */ "../views/HomeView.vue"),
    meta: {
      title: "Caligo — VS Code Theme Gallery",
      description: "50 perceptually uniform dark themes built on OKLCH color science",
      transition: "fade",
    },
  },
  {
    path: "/gallery",
    name: "gallery",
    component: () => import(/* webpackChunkName: "gallery" */ "../views/GalleryView.vue"),
    meta: {
      title: "Gallery — Caligo Themes",
      description: "Browse all 50 theme variations with screenshots",
      transition: "slide-left",
    },
  },
  {
    path: "/analysis",
    name: "analysis",
    component: () => import(/* webpackChunkName: "analysis" */ "../views/AnalysisView.vue"),
    meta: {
      title: "Color Analysis — Caligo Themes",
      description: "Interactive color science visualizations and WCAG compliance metrics",
      transition: "slide-left",
    },
  },
  {
    path: "/export",
    name: "export",
    component: () => import(/* webpackChunkName: "export" */ "../views/ExportView.vue"),
    meta: {
      title: "Export — Caligo Themes",
      description: "Export current Caligo colors in standards-based formats",
      transition: "slide-left",
    },
  },
  {
    path: "/wallpapers",
    name: "wallpapers",
    component: () => import(/* webpackChunkName: "wallpapers" */ "../views/WallpapersView.vue"),
    meta: {
      title: "Wallpapers — Caligo Themes",
      description: "50 unique wallpapers for monitor, tablet, and mobile",
      transition: "slide-left",
    },
  },
  {
    path: "/wallpapers/composer",
    name: "wallpapers-composer",
    component: () => import(/* webpackChunkName: "wallpapers-composer" */ "../views/WallpaperComposerView.vue"),
    meta: {
      title: "Wallpaper Composer — Caligo Themes",
      description: "Interactively explore wallpaper seeds, harmony modes, and platforms",
      transition: "slide-left",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import(/* webpackChunkName: "not-found" */ "../views/NotFoundView.vue"),
    meta: {
      title: "404 — Page Not Found",
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
router.beforeEach((to, _from, next) => {
  document.title = String(to.meta.title) || "Caligo";

  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && to.meta.description) {
    metaDescription.setAttribute("content", String(to.meta.description));
  }

  next();
});

export default router;
