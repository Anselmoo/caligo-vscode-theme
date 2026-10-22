<script setup lang="ts">
import BentoGrid from "../components/home/BentoGrid.vue";
import HeroStage from "../components/home/HeroStage.vue";
import SceneStrip from "../components/home/SceneStrip.vue";
import ThemeSpectrum from "../components/theme/ThemeSpectrum.vue";
import WearIt from "../components/theme/WearIt.vue";
</script>

<template>
  <div class="home">
    <HeroStage />

    <section id="spectrum" class="choose" aria-label="Choose a theme">
      <div class="choose__inner">
        <ThemeSpectrum />
        <WearIt />
      </div>
    </section>

    <BentoGrid />
    <SceneStrip />
    <div class="home__end" />
  </div>
</template>

<style scoped>
.choose {
  scroll-margin-top: 72px;
}

.choose__inner {
  display: grid;
  gap: clamp(28px, 4vw, 44px);
  max-width: var(--page-max);
  margin: 0 auto;
  padding: clamp(8px, 2vh, 24px) var(--gutter) 0;
}

.home__end {
  height: clamp(56px, 10vh, 120px);
}
</style>
