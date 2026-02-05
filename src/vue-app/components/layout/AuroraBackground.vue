<template>
  <div class="aurora-background" aria-hidden="true">
    <div class="aurora-layer aurora-layer--one"></div>
    <div class="aurora-layer aurora-layer--two"></div>
    <div class="aurora-layer aurora-layer--three"></div>
  </div>
</template>

<style scoped>
.aurora-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  filter: saturate(1.1);
}

.aurora-layer {
  position: absolute;
  inset: -30% -20% -20% -20%;
  opacity: 0.45;
  mix-blend-mode: screen;
  filter: blur(60px);
  transform: translate3d(0, 0, 0);
  animation: aurora-drift 24s ease-in-out infinite;
}

.aurora-layer--one {
  background:
    radial-gradient(40% 45% at 20% 20%, color-mix(in oklab, var(--accent) 60%, transparent) 0%, transparent 60%),
    radial-gradient(35% 40% at 70% 15%, color-mix(in oklab, var(--syntax-functions) 55%, transparent) 0%, transparent 65%),
    radial-gradient(45% 50% at 30% 70%, color-mix(in oklab, var(--syntax-types) 50%, transparent) 0%, transparent 70%);
  animation-duration: 26s;
}

.aurora-layer--two {
  background:
    radial-gradient(50% 50% at 80% 30%, color-mix(in oklab, var(--syntax-strings) 55%, transparent) 0%, transparent 65%),
    radial-gradient(45% 55% at 20% 80%, color-mix(in oklab, var(--syntax-keywords) 45%, transparent) 0%, transparent 70%);
  opacity: 0.35;
  filter: blur(70px);
  animation-duration: 32s;
}

.aurora-layer--three {
  background:
    radial-gradient(55% 55% at 60% 70%, color-mix(in oklab, var(--accent) 40%, transparent) 0%, transparent 70%),
    radial-gradient(40% 50% at 40% 30%, color-mix(in oklab, var(--syntax-decorator) 45%, transparent) 0%, transparent 70%);
  opacity: 0.3;
  filter: blur(90px);
  animation-duration: 38s;
}

@keyframes aurora-drift {
  0% {
    transform: translate3d(-4%, -2%, 0) rotate(0deg);
  }
  50% {
    transform: translate3d(4%, 3%, 0) rotate(8deg);
  }
  100% {
    transform: translate3d(-4%, -2%, 0) rotate(0deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-layer {
    animation: none;
  }
}
</style>
