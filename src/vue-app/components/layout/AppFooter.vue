<script setup lang="ts">
import { RouterLink } from "vue-router";
import SiteIcon from "../common/SiteIcon.vue";

const REPO = "https://github.com/Anselmoo/caligo-vscode-theme";
const MARKETPLACE =
  "https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme";
const year = new Date().getFullYear();

const external = [
  { href: MARKETPLACE, label: "Marketplace", icon: "marketplace" },
  { href: REPO, label: "GitHub", icon: "github" },
  { href: `${REPO}/blob/main/CONTRIBUTING.md`, label: "Contributing", icon: "contribute" },
  { href: `${REPO}/blob/main/LICENSE`, label: "License", icon: "license" },
] as const;
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__about">
        <p class="footer__slogan">
          Built with <SiteIcon name="heart" class="footer__heart" :size="15" /><span
            class="visually-hidden"
            >love</span
          >
          for developers who code after dark
          <SiteIcon name="moon" class="footer__moon" :size="14" />
        </p>
        <p class="footer__note">© {{ year }} Anselm Hahn. Open source under the MIT license.</p>
      </div>
      <nav class="footer__nav" aria-label="Footer">
        <RouterLink class="footer__link" to="/themes">Themes</RouterLink>
        <RouterLink class="footer__link" to="/wallpapers">Wallpapers</RouterLink>
        <RouterLink class="footer__link" to="/science">Science</RouterLink>
        <a
          v-for="link in external"
          :key="link.label"
          class="footer__link footer__link--ext"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          <SiteIcon :name="link.icon" :size="16" />
          {{ link.label }}
        </a>
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px 40px;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 36px var(--gutter) 40px;
}

.footer__about {
  display: grid;
  gap: 6px;
}

.footer__slogan {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 6px;
  margin: 0;
  color: var(--fg1);
  font-size: var(--step-0);
}

.footer__heart {
  color: var(--accent);
}

.footer__moon {
  color: var(--syntax-functions);
}

.footer__note {
  margin: 0;
  color: var(--fg-muted);
  font-size: var(--step--1);
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 22px;
}

.footer__link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  color: var(--fg-muted);
  font-size: var(--step--1);
  text-decoration: none;
  /* Colour changes with the theme go through a View Transition; a global colour
     transition on links would tween from the pre-theme default on first paint. */
  transition: none;
}

.footer__link:hover {
  color: var(--fg0);
}

.footer__link--ext :deep(.icon) {
  color: var(--fg1);
}
</style>
