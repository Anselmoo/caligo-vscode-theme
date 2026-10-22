<script setup lang="ts">
/**
 * The first screen: the theme's night scene, one big sentence, the way in, and a live
 * editor window that wears the selected theme. Everything is coloured by tokens.
 */
import { RouterLink } from "vue-router";
import { useTheme } from "../../composables/useTheme.js";
import CopyButton from "../common/CopyButton.vue";
import EditorPreview from "./EditorPreview.vue";
import SceneBackdrop from "./SceneBackdrop.vue";

const MARKETPLACE_URL =
  "https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme";
const INSTALL = "code --install-extension AnselmHahn.caligo-vscode-theme";

const { currentTheme, themes, seeds, harmonies } = useTheme();
</script>

<template>
  <section class="stage" aria-labelledby="hero-title">
    <SceneBackdrop />
    <div class="stage__inner">
      <div class="stage__copy">
        <p class="stage__kicker">
          <span class="stage__dot" aria-hidden="true" />
          {{ themes.length || 50 }} themes for VS Code
        </p>
        <h1 id="hero-title" class="stage__title">Dark themes for long nights of code.</h1>
        <p class="stage__lede">
          Fifty VS Code themes built in a perceptual colour space, so text stays readable and
          every hue stays distinct after hours at the screen.
        </p>
        <div class="stage__actions">
          <a class="btn-primary" :href="MARKETPLACE_URL" rel="noopener" target="_blank">
            Install from Marketplace
          </a>
          <RouterLink class="btn-quiet" :to="{ path: '/', hash: '#spectrum' }">Choose your night</RouterLink>
        </div>
        <div class="stage__cmd">
          <code class="stage__cmd-text">{{ INSTALL }}</code>
          <CopyButton :text="INSTALL" label="Copy install command" />
        </div>
      </div>

      <div class="stage__window">
        <EditorPreview class="stage__editor" />
        <p v-if="currentTheme" class="stage__badge">
          <span class="stage__swatches" aria-hidden="true">
            <i style="background: var(--accent)" />
            <i style="background: var(--syntax-keywords)" />
            <i style="background: var(--syntax-types)" />
            <i style="background: var(--syntax-functions)" />
            <i style="background: var(--syntax-decorator)" />
          </span>
          <span class="stage__badge-text">
            {{ currentTheme.seedLabel }}
            <span class="stage__badge-mode">{{ currentTheme.harmonyLabel }}</span>
          </span>
        </p>
      </div>
    </div>

    <p class="stage__scroll" aria-hidden="true">
      {{ seeds.length }} palettes · {{ harmonies.length }} moods
      <span class="stage__scroll-line" />
    </p>
  </section>
</template>

<style scoped>
.stage {
  position: relative;
  display: flex;
  min-height: min(calc(100svh - 56px), 900px);
  isolation: isolate;
}

.stage__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  gap: clamp(32px, 5vw, 88px);
  align-items: center;
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(48px, 10vh, 128px) var(--gutter) clamp(56px, 9vh, 112px);
}

.stage__copy {
  max-width: 40rem;
}

.stage__kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 22px;
  padding: 6px 14px 6px 12px;
  border: 1px solid color-mix(in oklab, var(--fg0) 16%, transparent);
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--bg0) 55%, transparent);
  backdrop-filter: blur(10px);
  color: var(--fg1);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.02em;
}

.stage__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 24%, transparent);
}

.stage__title {
  margin: 0 0 24px;
  color: var(--fg0);
  font-family: var(--font-display);
  font-size: clamp(2.3rem, 1.2rem + 3.6vw, 4.6rem);
  font-weight: 330;
  font-stretch: 108%;
  line-height: 1.04;
  letter-spacing: -0.045em;
  text-wrap: balance;
}

.stage__lede {
  max-width: 34rem;
  margin: 0 0 34px;
  color: var(--fg1);
  font-size: var(--step-1);
  line-height: 1.55;
  text-wrap: pretty;
}

.stage__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 22px;
}

.btn-primary,
.btn-quiet {
  display: inline-flex;
  align-items: center;
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-size: var(--step-0);
  font-weight: 600;
  text-decoration: none;
  transition:
    background 200ms var(--ease-out),
    border-color 200ms var(--ease-out),
    translate 200ms var(--ease-out);
}

.btn-primary {
  background: var(--accent);
  color: oklch(from var(--accent) 0.18 calc(c * 0.4) h);
  box-shadow: 0 14px 40px -14px var(--accent);
}

.btn-primary:hover {
  background: oklch(from var(--accent) calc(l + 0.06) c h);
  translate: 0 -2px;
}

.btn-quiet {
  color: var(--fg0);
  border: 1px solid color-mix(in oklab, var(--fg0) 22%, transparent);
  background: color-mix(in oklab, var(--bg0) 45%, transparent);
  backdrop-filter: blur(10px);
}

.btn-quiet:hover {
  border-color: color-mix(in oklab, var(--fg0) 45%, transparent);
  translate: 0 -2px;
}

.stage__cmd {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
  padding: 6px 8px 6px 16px;
  border: 1px solid color-mix(in oklab, var(--fg0) 12%, transparent);
  border-radius: 12px;
  background: color-mix(in oklab, var(--bg0) 70%, transparent);
  backdrop-filter: blur(10px);
}

.stage__cmd-text {
  min-width: 0;
  color: var(--fg1);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* The editor is a glass window that sits a little off-axis and squares up on hover. */
.stage__window {
  position: relative;
  perspective: 1600px;
}

.stage__editor {
  transform: rotateY(-7deg) rotateX(2.5deg);
  transform-origin: 60% 50%;
  transition: transform 600ms var(--ease-out);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--fg0) 10%, transparent),
    0 50px 120px -30px color-mix(in oklab, var(--accent) 45%, transparent);
}

.stage__window:hover .stage__editor,
.stage__window:focus-within .stage__editor {
  transform: rotateY(0) rotateX(0);
}

.stage__badge {
  position: absolute;
  right: clamp(8px, 3%, 28px);
  bottom: -22px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 10px 16px;
  border: 1px solid color-mix(in oklab, var(--fg0) 14%, transparent);
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--bg1) 82%, transparent);
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 40px -18px oklch(from var(--bg0) calc(l * 0.3) c h);
  color: var(--fg0);
  font-size: var(--step--1);
  font-weight: 600;
}

.stage__swatches {
  display: inline-flex;
  gap: 4px;
}

.stage__swatches i {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--fg0) 20%, transparent);
}

.stage__badge-mode {
  margin-left: 6px;
  color: var(--fg-muted);
  font-weight: 400;
}

.stage__scroll {
  position: absolute;
  z-index: 1;
  inset: auto 0 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stage__scroll-line {
  width: 1px;
  height: 34px;
  background: linear-gradient(to bottom, var(--fg-muted), transparent);
  transform-origin: top;
  animation: cue 2.4s var(--ease-out) infinite;
}

@keyframes cue {
  0% {
    transform: scaleY(0);
  }
  60% {
    transform: scaleY(1);
  }
  100% {
    transform: scaleY(1);
    opacity: 0;
  }
}

@media (max-width: 960px) {
  .stage__inner {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage__copy {
    max-width: none;
  }

  .stage__editor {
    transform: none;
  }

  .stage__scroll {
    display: none;
  }

  .stage__badge {
    position: static;
    margin-top: 14px;
  }
}

@media (max-width: 520px) {
  .stage__actions > * {
    flex: 1 1 100%;
    justify-content: center;
  }

  .stage__cmd {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }

  .stage__cmd-text {
    padding: 0;
    background: none;
    font-size: 0.78rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage__editor,
  .btn-primary,
  .btn-quiet {
    transition: none;
  }

  .stage__editor {
    transform: none;
  }

  .stage__scroll-line {
    animation: none;
  }
}
</style>
