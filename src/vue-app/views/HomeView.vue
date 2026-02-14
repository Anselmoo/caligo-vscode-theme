<script setup lang="ts">
import { computed } from "vue";
import ExportAllColors from "../components/export/ExportAllColors.vue";
import ExportPanel from "../components/export/ExportPanel.vue";
import CorePalette from "../components/theme/CorePalette.vue";
import LiveTokenSample from "../components/theme/LiveTokenSample.vue";
import ThemeSpectrum from "../components/theme/ThemeSpectrum.vue";
import VSCodeMock from "../components/theme/VSCodeMock.vue";
import { useTheme } from "../composables/useTheme.js";

const { themes, seeds, harmonies } = useTheme();

const stats = computed(() => ({
  seedPalettes: seeds.value.length,
  harmonyModes: harmonies.value.length,
  totalThemes: themes.value.length,
}));

// Some TS configurations (and editor diagnostics) don't account for template usage
// when reporting noUnusedLocals in <script setup>.
void CorePalette;
void ExportAllColors;
void ExportPanel;
void LiveTokenSample;
void ThemeSpectrum;
void VSCodeMock;
void stats;
</script>

<template>
  <div class="home-view">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <div class="hero-layout">
          <div class="hero-left">
            <span class="kicker text-keywords">Visual Studio Code • Color Themes</span>
            <h1>Caligo</h1>
            <p class="hero-subtitle text-types">
              OKLCH-powered VS Code themes with scientific harmony variants
            </p>
            <p class="hero-description text-functions">
              {{ stats.totalThemes }} variants generated from {{ stats.seedPalettes }} seed palettes × {{ stats.harmonyModes }} harmony modes.
              Built for long sessions: perceptual uniformity, consistent contrast, and intent-aware syntax.
            </p>
            
            <!-- Stats -->
            <div class="hero-stats">
              <div class="hero-stat hero-stat--types">
                <div class="hero-stat-value">{{ stats.seedPalettes || '—' }}</div>
                <div class="hero-stat-label">Seed Palettes</div>
              </div>
              <div class="hero-stat hero-stat--keywords">
                <div class="hero-stat-value">{{ stats.harmonyModes || '—' }}</div>
                <div class="hero-stat-label">Harmony Modes</div>
              </div>
              <div class="hero-stat hero-stat--functions">
                <div class="hero-stat-value">{{ stats.totalThemes || '—' }}</div>
                <div class="hero-stat-label">Total Themes</div>
              </div>
            </div>
            
            <!-- CTA Buttons -->
            <div class="btn-row">
              <a
                href="https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme"
                class="btn btn--primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i class="pi pi-microsoft"></i>
                <span>Install from Marketplace</span>
              </a>
              <a
                href="https://github.com/Anselmoo/caligo-vscode-theme"
                class="btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i class="pi pi-github"></i>
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
          
          <div class="hero-right">
            <VSCodeMock />
          </div>
        </div>
      </div>
    </section>
    
    <!-- Theme Spectrum Section -->
    <section class="section">
      <div class="container">
        <ThemeSpectrum />
      </div>
    </section>
    
    <!-- Preview Section (Core Palette + Live Token Sample) -->
    <section class="section preview-section">
      <div class="container">
        <h2 class="section-title">Preview</h2>
        <p class="section-subtitle text-subtle">
          The page is fully skinned by your selection (seed + harmony). 
          Use the navbar selectors or click the spectrum matrix.
        </p>
        
        <div class="preview-grid">
          <CorePalette />
          <LiveTokenSample />
          <ExportPanel />
          <ExportAllColors />
        </div>
      </div>
    </section>
    
    <!-- Design Philosophy Section -->
    <section class="section philosophy-section">
      <div class="container">
        <h2 class="section-title">Design Philosophy</h2>
        <p class="section-subtitle text-subtle">
          Built on OKLCH color science for perceptual uniformity and accessibility
        </p>
        
        <div class="philosophy-grid">
          <div class="philosophy-card philosophy-card--types">
            <i class="pi pi-palette philosophy-icon"></i>
            <h3>OKLCH Color Space</h3>
            <p>
              All colors use OKLCH for perceptually uniform brightness and hue distribution.
              This ensures consistent visual weight across all accent colors and maintains
              readability regardless of the harmony mode selected.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--keywords">
            <i class="pi pi-objects-column philosophy-icon"></i>
            <h3>Harmony Modes</h3>
            <p>
              Each seed palette generates 5 harmony variations: balanced (original), 
              analogous, monochromatic, split-complementary, and triadic. These modes
              provide visual variety while maintaining semantic clarity in code.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--functions">
            <i class="pi pi-verified philosophy-icon"></i>
            <h3>WCAG AAA Compliant</h3>
            <p>
              All foreground/background pairs meet WCAG AAA contrast standards (7:1 minimum).
              Token colors are validated to maintain at least AA compliance (4.5:1) against
              the background for optimal readability.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--strings">
            <i class="pi pi-code philosophy-icon"></i>
            <h3>Intent-Aware Syntax</h3>
            <p>
              Syntax highlighting follows semantic intent rather than arbitrary color mapping.
              Keywords, types, functions, strings, and decorators each have distinct,
              purposeful colors that enhance code comprehension.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--decorator">
            <i class="pi pi-ban philosophy-icon"></i>
            <h3>No Forbidden Black</h3>
            <p>
              Forbidden near-black tones are excluded from generation. All dark tones maintain
              subtle color temperature and depth, reducing eye strain during extended
              coding sessions.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--accent">
            <i class="pi pi-cog philosophy-icon"></i>
            <h3>Systematic Generation</h3>
            <p>
              Themes are generated programmatically from seed palettes using TypeScript,
              ensuring consistency, maintainability, and adherence to design constraints
              across all 50 variations.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--decorator">
            <i class="pi pi-sitemap philosophy-icon"></i>
            <h3>AI-Guided Architecture</h3>
            <p>
              Architecture decisions leverage AI-powered design prompt builders to explore
              optimal patterns, validate design choices against best practices, and ensure
              scalable, maintainable system architecture for theme generation infrastructure.
            </p>
          </div>
          
          <div class="philosophy-card philosophy-card--accent">
            <i class="pi pi-book philosophy-icon"></i>
            <h3>Research-Driven Design</h3>
            <p>
              Development integrates real-time library documentation access and web research
              capabilities to validate color theory implementations, accessibility standards,
              and modern design patterns against current best practices.
            </p>
          </div>
          
        </div>
      </div>
    </section>
    
    <!-- Features Section -->
    <section class="section features">
      <div class="container">
        <h2 class="section-title">Features</h2>
        <div class="features-grid">
          <div class="feature-card feature-card--types">
            <h3>50 Theme Variations</h3>
            <p>10 seed palettes × 5 harmony modes for diverse visual experiences</p>
          </div>
          <div class="feature-card feature-card--functions">
            <h3>Multi-Language Support</h3>
            <p>Optimized syntax highlighting for TypeScript, Python, Rust, Go, and more</p>
          </div>
          <div class="feature-card feature-card--strings">
            <h3>Perceptual Uniformity</h3>
            <p>OKLCH ensures colors have consistent perceived brightness</p>
          </div>
          <div class="feature-card feature-card--keywords">
            <h3>Long-Session Friendly</h3>
            <p>Designed for extended coding with reduced eye strain</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  min-height: 100vh;
}

.hero {
  padding: var(--space-3xl) 0;
  background: linear-gradient(180deg, var(--bg0) 0%, var(--bg1) 100%);
}

.hero-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3xl);
  align-items: center;
}

.hero-left {
  text-align: left;
}

.kicker {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--space-md);
  padding: var(--space-xs) var(--space-md);
  background: var(--glow-keywords);
  border-radius: var(--radius-full);
  border: 1px solid var(--glow-keywords);
}


.hero-subtitle {
  font-size: var(--text-2xl);
  margin-bottom: var(--space-md);
  font-weight: 600;
  line-height: 1.3;
}

.hero-description {
  font-size: var(--text-base);
  margin-bottom: var(--space-xl);
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  gap: var(--space-2xl);
  margin-bottom: var(--space-2xl);
}

.hero-stat {
  text-align: left;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.hero-stat:hover {
  border-color: var(--stat-color);
  background: var(--stat-bg-color);
  transform: translateY(-2px);
}

.hero-stat--types {
  --stat-color: var(--syntax-types);
  --stat-color-rgb: var(--syntax-types-rgb);
  --stat-bg-color: var(--stat-bg-types);
  --stat-text-color: var(--stat-text-types);
}

.hero-stat--keywords {
  --stat-color: var(--syntax-keywords);
  --stat-color-rgb: var(--syntax-keywords-rgb);
  --stat-bg-color: var(--stat-bg-keywords);
  --stat-text-color: var(--stat-text-keywords);
}

.hero-stat--functions {
  --stat-color: var(--syntax-functions);
  --stat-color-rgb: var(--syntax-functions-rgb);
  --stat-bg-color: var(--stat-bg-functions);
  --stat-text-color: var(--stat-text-functions);
}

.hero-stat-value {
  font-size: var(--text-4xl);
  font-weight: 700;
  color: var(--stat-color, var(--accent));
  line-height: 1;
  margin-bottom: var(--space-xs);
  text-shadow: 0 2px 8px rgba(var(--stat-color-rgb), 0.3);
}

.hero-stat-label {
  font-size: var(--text-sm);
  color: var(--stat-text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-right {
  display: flex;
  justify-content: center;
  align-items: center;
}

.btn-row {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.btn i {
  font-size: 18px;
}

.btn--primary {
  background: var(--accent);
  color: var(--bg0);
}

.btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px var(--glow-accent-strong);
}

.btn:not(.btn--primary) {
  background: var(--interactive-hover);
  border-color: var(--border-base);
  color: var(--syntax-types);
}

.btn:not(.btn--primary):hover {
  background: var(--interactive-hover-strong);
  border-color: var(--accent);
}

.section {
  padding: var(--space-3xl) 0;
}

.section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-lg);
}

.section-subtitle {
  font-size: var(--text-base);
  text-align: center;
  max-width: 700px;
  margin: 0 auto var(--space-2xl);
  line-height: 1.6;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-xl);
  margin-top: var(--space-2xl);
}

@media (min-width: 1024px) {
  .preview-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.philosophy-section {
  background: linear-gradient(180deg, var(--bg0) 0%, var(--bg1) 100%);
}

.philosophy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-2xl);
}

.philosophy-card {
  padding: var(--space-xl);
  background: var(--surface-overlay);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
  overflow: hidden;
  --card-accent-color: var(--text-strong);
  --card-accent-rgb: var(--syntax-keywords-rgb);
}

.philosophy-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--card-accent-color);
  opacity: 0.8;
}

.philosophy-card:hover {
  border-color: var(--card-accent-color);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(var(--card-accent-rgb), 0.25);
  background: rgba(var(--card-accent-rgb), 0.08);
}


.philosophy-icon {
  font-size: 48px;
  margin-bottom: var(--space-md);
  line-height: 1;
  color: var(--text-strong);
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 8px rgba(var(--card-accent-rgb), 0.3));
}

.philosophy-card:hover .philosophy-icon {
  transform: scale(1.15) rotate(5deg);
  filter: drop-shadow(0 4px 16px rgba(var(--card-accent-rgb), 0.5));
}

.philosophy-card h3 {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-strong);
}

.philosophy-card p {
  color: var(--text-subtle);
  line-height: 1.6;
  font-size: var(--text-sm);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}

.feature-card {
  padding: var(--space-xl);
  background: var(--surface-overlay);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  --card-accent-color: var(--text-strong);
  --card-accent-rgb: var(--syntax-keywords-rgb);
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-accent-color);
  opacity: 0.6;
}

.feature-card:hover {
  border-color: var(--card-accent-color);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(var(--card-accent-rgb), 0.2);
  background: rgba(var(--card-accent-rgb), 0.05);
}


.feature-card h3 {
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--text-strong);
}

.feature-card p {
  color: var(--text-subtle);
  line-height: 1.6;
  font-size: var(--text-sm);
}

@media (max-width: 1024px) {
  .hero-layout {
    grid-template-columns: 1fr;
    gap: var(--space-2xl);
  }
  
  .hero-left {
    text-align: center;
  }
  
  .hero-stats {
    justify-content: center;
  }
  
  .hero-stat {
    text-align: center;
  }
  
  .btn-row {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  
  .hero-subtitle {
    font-size: var(--text-xl);
  }
  
  .hero-stats {
    flex-direction: column;
    gap: var(--space-lg);
    align-items: center;
  }
}
</style>
