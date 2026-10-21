<script setup lang="ts">
/**
 * The two steps from "I like this one" to having it in VS Code: install the
 * extension, then pick the exact theme name the active variant ships under.
 */
import { RouterLink } from "vue-router";
import { useTheme } from "../../composables/useTheme.js";
import CopyButton from "../common/CopyButton.vue";

const INSTALL = "code --install-extension AnselmHahn.caligo-vscode-theme";
const { currentTheme } = useTheme();
</script>

<template>
  <section v-if="currentTheme" class="wear" aria-labelledby="wear-title">
    <h3 id="wear-title" class="wear__title">Wear {{ currentTheme.displayName }} in VS Code</h3>
    <ol class="wear__steps">
      <li class="wear__step">
        <span class="wear__what">Install the extension</span>
        <code class="wear__code">{{ INSTALL }}</code>
        <CopyButton :text="INSTALL" label="Copy command" />
      </li>
      <li class="wear__step">
        <span class="wear__what">Open Preferences: Color Theme and choose</span>
        <code class="wear__code">{{ currentTheme.vscodeLabel }}</code>
        <CopyButton :text="currentTheme.vscodeLabel" label="Copy name" />
      </li>
    </ol>
    <p class="wear__more">
      <RouterLink to="/themes">See it in the editor</RouterLink>
      <RouterLink to="/wallpapers">Matching wallpapers</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.wear {
  display: grid;
  gap: 16px;
  padding: clamp(18px, 3vw, 28px);
  border-radius: 18px;
  border: 1px solid color-mix(in oklab, var(--accent) 28%, transparent);
  background: linear-gradient(
    120deg,
    color-mix(in oklab, var(--accent) 9%, var(--bg1)),
    color-mix(in oklab, var(--bg1) 85%, var(--bg0))
  );
}

.wear__title {
  margin: 0;
  color: var(--fg0);
  font-size: var(--step-1);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.wear__steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}

.wear__step {
  display: grid;
  grid-template-columns: minmax(0, 15rem) minmax(0, 1fr) auto;
  gap: 8px 16px;
  align-items: center;
  counter-increment: step;
}

.wear__what {
  color: var(--fg1);
  font-size: var(--step--1);
}

.wear__what::before {
  content: counter(step) ". ";
  color: var(--fg-muted);
}

.wear__code {
  overflow-x: auto;
  padding: 8px 12px;
  border-radius: 8px;
  background: color-mix(in oklab, var(--bg0) 80%, transparent);
  color: var(--syntax-strings);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  white-space: nowrap;
  scrollbar-width: none;
}

.wear__more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  font-size: var(--step--1);
}

.wear__more a {
  color: var(--fg0);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--fg0) 40%, transparent);
  text-underline-offset: 4px;
}

.wear__more a:hover {
  text-decoration-color: var(--accent);
}

@media (max-width: 720px) {
  .wear__step {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .wear__what {
    grid-column: 1 / -1;
  }
}
</style>
