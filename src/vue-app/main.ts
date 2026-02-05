/**
 * Vue 3 Application Entry Point
 * Caligo Theme Preview System
 */

import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";

// Global styles - ORDER MATTERS
import "./styles/reset.css";
import "./styles/variables.css"; // Non-color tokens only (spacing, typography, etc.)
import "./styles/semantic-tokens.css"; // Derived color tokens (hover, borders, surfaces)
import "./styles/typography.css"; // Consistent heading/text hierarchy
import "./styles/color-utilities.css"; // Utility classes
import "./styles/globals.css";
import "primeicons/primeicons.css";

const pinia = createPinia();
const app = createApp(App);

// Use Pinia and Vue Router
app.use(pinia);
app.use(router);

// Mount app to DOM
app.mount("#app");
