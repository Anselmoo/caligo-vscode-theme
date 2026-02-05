<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "../../composables/useTheme.js";

const { currentTheme } = useTheme();

const themeDisplayName = computed(() => currentTheme.value?.displayName || "Deep Sable — Balanced");

// Some tooling/lint setups don’t account for Vue template usage when checking <script setup>.
// This keeps the ref “used” without affecting runtime behavior.
void themeDisplayName;
</script>

<template>
  <div class="vscode-mock" role="img" aria-label="VS Code editor preview">
    <!-- Title bar with macOS-style dots -->
    <div class="vscode-mock__titlebar">
      <div class="vscode-mock__dots">
        <div class="vscode-mock__dot vscode-mock__dot--close" />
        <div class="vscode-mock__dot vscode-mock__dot--minimize" />
        <div class="vscode-mock__dot vscode-mock__dot--maximize" />
      </div>
      <div class="vscode-mock__tab">
        <i class="vscode-mock__file-icon pi pi-file" aria-hidden="true"></i>
        <span class="vscode-mock__tab-name">caligo.ts</span>
      </div>
    </div>
    
    <!-- Editor body with sidebar and content -->
    <div class="vscode-mock__body">
      <!-- Sidebar file explorer -->
      <div class="vscode-mock__sidebar">
        <div class="vscode-mock__file">
          <i class="vscode-mock__file-icon pi pi-file" aria-hidden="true"></i>
          <span class="vscode-mock__file-name">README.md</span>
        </div>
        <div class="vscode-mock__file active">
          <i class="vscode-mock__file-icon pi pi-file" aria-hidden="true"></i>
          <span class="vscode-mock__file-name">caligo.ts</span>
        </div>
        <div class="vscode-mock__file">
          <i class="vscode-mock__file-icon pi pi-file" aria-hidden="true"></i>
          <span class="vscode-mock__file-name">theme.json</span>
        </div>
      </div>
      
      <!-- Editor content area -->
      <div class="vscode-mock__editor">
        <pre class="sample-code"><span class="tok-keyword">function</span> <span class="tok-fn">hexToOklch</span>(<span class="tok-keyword">hex</span><span class="tok-punct">:</span> <span class="tok-type">string</span>)<span class="tok-punct">:</span> <span class="tok-type">string</span> <span class="tok-punct">{</span>
  <span class="tok-keyword">return</span> <span class="tok-string">`oklch(</span><span class="tok-string">${</span><span class="tok-string">0.72</span><span class="tok-string">}</span> <span class="tok-string">${</span><span class="tok-string">0.16</span><span class="tok-string">}</span> <span class="tok-string">${</span><span class="tok-string">248</span><span class="tok-string">}</span> <span class="tok-string">/ 1)`</span><span class="tok-punct">;</span>
<span class="tok-punct">}</span>

<span class="tok-keyword">const</span> <span class="tok-fn">theme</span> <span class="tok-punct">=</span> <span class="tok-string">"</span><span class="tok-string" data-current-theme>{{ themeDisplayName }}</span><span class="tok-string">"</span><span class="tok-punct">;</span>

<span class="tok-decorator">@</span><span class="tok-fn">sealed</span>
<span class="tok-keyword">class</span> <span class="tok-type">Palette</span> <span class="tok-punct">{</span> <span class="tok-fn">render</span>() <span class="tok-punct">{</span> <span class="tok-keyword">return</span> <span class="tok-string">"Oklch()"</span><span class="tok-punct">;</span> <span class="tok-punct">}</span>
  <span class="tok-muted">// Intent-aware syntax</span>
<span class="tok-punct">}</span></pre>
      </div>
    </div>

    <!-- Status bar (footer) -->
    <div class="vscode-mock__statusbar" aria-hidden="true">
      <div class="vscode-mock__status-left">
        <span class="vscode-mock__status-item vscode-mock__status-item--accent">Caligo</span>
        <span class="vscode-mock__status-sep">•</span>
        <span class="vscode-mock__status-item">{{ themeDisplayName }}</span>
      </div>
      <div class="vscode-mock__status-right">
        <span class="vscode-mock__status-item">Ln 12, Col 5</span>
        <span class="vscode-mock__status-sep">•</span>
        <span class="vscode-mock__status-item">UTF-8</span>
        <span class="vscode-mock__status-sep">•</span>
        <span class="vscode-mock__status-item">TypeScript</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vscode-mock {
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--vscode-editor-bg, var(--bg0));
  /* Ensure even unstyled text inside the mock never inherits low-chroma fg0 */
  color: var(--vscode-editor-fg, var(--syntax-types));
  border: 1px solid var(--border-color);
  box-shadow: 0 12px 32px rgba(var(--bg0-rgb), 0.75);
  max-width: 800px;
  margin: 0 auto;
}

.vscode-mock__titlebar {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--vscode-titlebar-bg, var(--bg1));
  color: var(--vscode-titlebar-fg, var(--fg-muted));
  opacity: 1;
  border-bottom: 1px solid rgba(var(--fg0-rgb), 0.08);
}

.vscode-mock__dots {
  display: flex;
  gap: 6px;
}

.vscode-mock__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.vscode-mock__dot--close {
  background: var(--vscode-window-close, var(--syntax-error));
}

.vscode-mock__dot--minimize {
  background: var(--vscode-window-minimize, var(--syntax-decorator));
}

.vscode-mock__dot--maximize {
  background: var(--vscode-window-maximize, var(--syntax-functions));
}

.vscode-mock__tab {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md);
  background: var(--vscode-tab-bg, var(--bg2));
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  font-size: var(--text-sm);
  color: var(--vscode-tab-fg, var(--fg0));
}

.vscode-mock__tab-icon {
  font-size: 14px;
}

.vscode-mock__body {
  display: flex;
  min-height: 280px;
}

.vscode-mock__sidebar {
  width: 180px;
  background: var(--vscode-sidebar-bg, var(--bg1));
  border-right: 1px solid rgba(var(--fg0-rgb), 0.08);
  padding: var(--space-sm);
}

.vscode-mock__file {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--vscode-sidebar-fg, var(--fg0));
  opacity: 1;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vscode-mock__file:hover {
  background: rgba(var(--fg0-rgb), 0.05);
}

.vscode-mock__file.active {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  opacity: 1;
}

.vscode-mock__file-icon {
  font-size: 14px;
}

.vscode-mock__editor {
  flex: 1;
  background: var(--vscode-editor-bg, var(--bg0));
  padding: var(--space-lg);
  overflow-x: auto;
}

.sample-code {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--vscode-editor-fg, var(--fg0));
  margin: 0;
  white-space: pre;
}

/* Syntax highlighting tokens */
.tok-keyword {
  color: var(--syntax-keywords);
  font-weight: 600;
}

.tok-type {
  color: var(--syntax-types);
}

.tok-fn {
  color: var(--syntax-functions);
}

.tok-string {
  color: var(--syntax-strings);
}

.tok-decorator {
  color: var(--syntax-decorator);
  font-style: italic;
}

.tok-error {
  color: var(--syntax-error);
}

.tok-muted {
  color: var(--vscode-syntax-comment, var(--syntax-decorator));
  opacity: 1;
  font-style: italic;
}

.tok-punct {
  color: var(--vscode-syntax-punct, var(--syntax-types));
}

.vscode-mock__statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-xs) var(--space-md);
  background: var(--vscode-statusbar-bg, var(--bg2));
  color: var(--vscode-statusbar-fg, var(--fg0));
  opacity: 1;
  border-top: 1px solid rgba(var(--fg0-rgb), 0.08);
  font-size: var(--text-xs);
}

.vscode-mock__status-left,
.vscode-mock__status-right {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.vscode-mock__status-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vscode-mock__status-item--accent {
  color: var(--vscode-statusbar-accent, var(--accent));
  font-weight: 700;
}

.vscode-mock__status-sep {
  color: var(--vscode-statusbar-sep, var(--syntax-decorator));
  opacity: 1;
}

@media (max-width: 640px) {
  .vscode-mock__sidebar {
    display: none;
  }
  
  .vscode-mock__editor {
    padding: var(--space-md);
  }
  
  .sample-code {
    font-size: var(--text-xs);
  }
}
</style>
