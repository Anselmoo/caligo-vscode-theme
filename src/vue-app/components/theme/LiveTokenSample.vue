<script setup lang="ts">
// No props needed - colors come from CSS variables applied by useTheme
</script>

<template>
  <div class="live-token-sample preview-panel">
    <div class="live-token-header">
      <h3 class="live-token-title">Live token sample</h3>
      <p class="live-token-subtitle">This snippet is colored by the currently selected theme.</p>
    </div>
    
    <pre class="sample-code"><span class="tok-decorator">@</span><span class="tok-fn">sealed</span>

<span class="tok-keyword">export class</span> <span class="tok-type">Palette</span> <span class="tok-punct">{</span>
  <span class="tok-keyword">constructor</span><span class="tok-punct">(</span><span class="tok-keyword">private readonly</span> <span class="tok-fn">name</span><span class="tok-punct">:</span> <span class="tok-type">string</span><span class="tok-punct">)</span> <span class="tok-punct">{}</span>

  <span class="tok-fn">render</span><span class="tok-punct">():</span> <span class="tok-type">string</span> <span class="tok-punct">{</span>
    <span class="tok-keyword">return</span> <span class="tok-string">"Caligo: "</span> <span class="tok-punct">+</span> <span class="tok-keyword">this</span><span class="tok-punct">.</span><span class="tok-fn">name</span><span class="tok-punct">;</span>
  <span class="tok-punct">}</span>
<span class="tok-punct">}</span>

<span class="tok-muted">// error throw new Error("Forbidden black");</span></pre>
  </div>
</template>

<style scoped>
.live-token-sample {
  padding: var(--space-xl);
}

.live-token-header {
  margin-bottom: var(--space-lg);
}

.live-token-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--app-text-primary, var(--syntax-types));
  margin-bottom: var(--space-xs);
}

.live-token-subtitle {
  font-size: var(--text-sm);
  color: var(--app-text-muted, var(--syntax-functions));
  margin: 0;
}

.sample-code {
  background: var(--bg0);
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  font-family: var(--font-mono, 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace);
  font-size: var(--text-sm);
  line-height: 1.6;
  overflow-x: auto;
  /* Keep the base “plain text” chromatic to avoid gray/white/black-looking output */
  color: var(--syntax-types);
}

/* Syntax highlighting using theme CSS variables */
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
}

.tok-error {
  color: var(--syntax-error);
}

.tok-muted {
  color: var(--syntax-decorator);
  font-style: italic;
}

.tok-punct {
  color: var(--syntax-types);
}
</style>
