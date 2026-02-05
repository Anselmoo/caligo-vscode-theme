/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // biome-ignore lint/suspicious/noExplicitAny: Vue component data structure
  // biome-ignore lint/complexity/noBannedTypes: Vue module declaration uses standard pattern
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
