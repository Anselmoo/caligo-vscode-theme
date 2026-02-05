<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import AnalysisAsyncError from "../components/analysis/AnalysisAsyncError.vue";
import AnalysisAsyncLoading from "../components/analysis/AnalysisAsyncLoading.vue";

const activeTab = ref("wheel");

const OKLCHPolarWheel = defineAsyncComponent({
  loader: () => import("../components/analysis/OKLCHPolarWheel.vue"),
  loadingComponent: AnalysisAsyncLoading,
  errorComponent: AnalysisAsyncError,
  delay: 150,
  timeout: 20000,
});

const LightnessPlots = defineAsyncComponent({
  loader: () => import("../components/analysis/LightnessPlots.vue"),
  loadingComponent: AnalysisAsyncLoading,
  errorComponent: AnalysisAsyncError,
  delay: 150,
  timeout: 20000,
});

const tabs = [
  { id: "wheel", label: "OKLCH Polar Wheel", icon: "pi-circle" },
  { id: "density", label: "C-L- & H-L-Density Map", icon: "pi-chart-scatter" },
];

const references = [
  {
    title: "OKLCH Color Picker & Converter",
    description: "Interactive tool for exploring OKLCH color space by Evil Martians",
    url: "https://github.com/evilmartians/oklch-picker",
  },
  {
    title: "Pro Color Harmonies",
    description: "OKLCH-based color harmony generation library",
    url: "https://github.com/meodai/pro-color-harmonies",
  },
  {
    title: "Harmony.js",
    description: "Generative color harmony palette library",
    url: "https://github.com/emilwidlund/harmony",
  },
  {
    title: "W3C WCAG 2.1 Non-text Contrast",
    description: "Official accessibility guidelines for contrast ratios",
    url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
  },
  {
    title: "IBM Carbon Design System - Color Accessibility",
    description: "Industry-standard WCAG implementation patterns",
    url: "https://v10.carbondesignsystem.com/guidelines/accessibility/color/",
  },
  {
    title: "Why You Should Use OKLCH in CSS",
    description: "Comprehensive Medium article on OKLCH advantages over HSL/RGB",
    url: "https://medium.com/@szaranger/why-you-should-use-oklch-in-css-4dd7542f6da4",
  },
  {
    title: "Oklab Color Space",
    description: "Björn Ottosson’s original write-up on Oklab and its perceptual benefits",
    url: "https://bottosson.github.io/posts/oklab/",
  },
  {
    title: "CSS Color Module Level 4",
    description: "W3C spec for modern color spaces including OKLCH and color interpolation",
    url: "https://www.w3.org/TR/css-color-4/",
  },
];

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void activeTab;
void OKLCHPolarWheel;
void LightnessPlots;
void tabs;
void references;
</script>

<template>
  <div class="analysis-view">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <h1>Theme Analysis</h1>
        <p class="description">
          Inspect the current theme in OKLCH: harmony, lightness, chroma distribution, and contrast checks.
        </p>
      </div>
    </section>

    <!-- Analysis Tabs -->
    <section class="section tabs-section">
      <div class="container">
        <div class="tabs-wrapper">
          <!-- Tab Navigation -->
          <div class="tabs-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="['tab-button', { active: activeTab === tab.id }]"
              @click="activeTab = tab.id"
            >
              <i :class="['pi', tab.icon]"></i>
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tabs-content">
            <div v-show="activeTab === 'wheel'" class="tab-panel">
              <OKLCHPolarWheel />
            </div>
            <div v-show="activeTab === 'density'" class="tab-panel">
              <LightnessPlots />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- References (optional) -->
    <section class="section references-section">
      <div class="container">
        <h2 class="section-title">Resources</h2>
        <p class="section-subtitle">
          Helpful tools and guidelines used while building Caligo
        </p>
        <div class="references-grid">
          <a
            v-for="ref in references"
            :key="ref.url"
            :href="ref.url"
            target="_blank"
            rel="noopener noreferrer"
            class="reference-card"
          >
            <i class="pi pi-external-link reference-icon"></i>
            <h3 class="reference-title">{{ ref.title }}</h3>
            <p class="reference-description">{{ ref.description }}</p>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.analysis-view {
  min-height: 100vh;
}

.hero {
  padding: var(--space-3xl) 0 var(--space-2xl);
  background: transparent;
  text-align: center;
}

.kicker {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--syntax-keywords);
  margin-bottom: var(--space-md);
  padding: var(--space-xs) var(--space-md);
  background: var(--glow-keywords);
  border-radius: var(--radius-full);
  border: 1px solid rgba(var(--syntax-keywords-rgb), 0.35);
}


.hero-description {
  font-size: var(--text-lg);
  color: var(--syntax-functions);
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
}

.section {
  padding: var(--space-3xl) 0;
}

.tabs-section {
  background: transparent;
}

.tabs-wrapper {
  background: rgba(var(--bg2-rgb), 0.3);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-xl);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.tabs-nav {
  display: flex;
  border-bottom: 1px solid var(--border-muted);
  background: rgba(var(--bg1-rgb), 0.5);
  overflow-x: auto;
  scrollbar-width: thin;
}

.tab-button {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-xl);
  background: transparent;
  border: none;
  color: var(--text-subtle);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.tab-button i {
  font-size: 18px;
}

.tab-button:hover {
  color: var(--syntax-types);
  background: rgba(var(--accent-rgb), 0.05);
}

.tab-button.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
}

.tabs-content {
  padding: var(--space-2xl);
  min-height: 400px;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.references-section {
  background: transparent;
}

.section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-lg);
}

.section-subtitle {
  font-size: var(--text-base);
  color: var(--text-subtle);
  text-align: center;
  max-width: 700px;
  margin: 0 auto var(--space-2xl);
  line-height: 1.6;
}

.references-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.reference-card {
  padding: var(--space-xl);
  background: rgba(var(--bg2-rgb), 0.5);
  border: 1px solid var(--border-muted);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
}

.reference-card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(var(--accent-rgb), 0.15);
}

.reference-icon {
  font-size: 24px;
  color: var(--accent);
  margin-bottom: var(--space-md);
}

.reference-title {
  font-size: var(--text-lg);
  font-weight: 700;
  margin-bottom: var(--space-sm);
  color: var(--accent);
}

.reference-description {
  font-size: var(--text-sm);
  color: var(--text-subtle);
  line-height: 1.6;
}

@media (max-width: 768px) {

  .featured-header {
    flex-direction: column;
    gap: var(--space-md);
  }

  .featured-icon {
    font-size: 36px;
  }

  .tabs-nav {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }

  .tab-button {
    padding: var(--space-md) var(--space-lg);
    font-size: var(--text-xs);
  }

  .tabs-content {
    padding: var(--space-lg);
  }

  .references-grid {
    grid-template-columns: 1fr;
  }
}
</style>
