<script setup lang="ts">
import { RouterLink } from "vue-router";

const REPO = "https://github.com/Anselmoo/caligo-vscode-theme";
const MARKETPLACE =
  "https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme";
const year = new Date().getFullYear();

</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <p class="footer__note">Caligo is open source under the MIT license. Copyright {{ year }} Anselm Hahn.</p>
      <nav class="footer__nav" aria-label="Footer">
        <RouterLink class="footer__link" to="/themes">Themes</RouterLink>
        <a class="footer__link" :href="MARKETPLACE" target="_blank" rel="noopener noreferrer"
          >Marketplace</a
        >
        <a class="footer__link" :href="REPO" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a
          class="footer__link"
          :href="`${REPO}/blob/main/LICENSE`"
          target="_blank"
          rel="noopener noreferrer"
          >License</a
        >
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: auto;
  border-top: 1px solid color-mix(in oklab, var(--fg0) 10%, transparent);
  background: var(--bg0);
  font-family: var(--font-sans);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 40px;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 28px var(--gutter);
}

.footer__note {
  max-width: var(--measure);
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--step--1);
  line-height: 1.5;
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
}

.footer__link {
  padding: 4px 0;
  color: var(--fg-muted);
  font-size: var(--step--1);
  text-decoration: underline;
  text-decoration-color: color-mix(in oklab, var(--fg-muted) 45%, transparent);
  text-underline-offset: 4px;
  /* Colour changes with the theme go through a View Transition; a global colour
     transition on links would tween from the pre-theme default on first paint. */
  transition: none;
}

.footer__link:hover {
  color: var(--fg-muted);
  text-decoration-color: currentColor;
}
</style>
