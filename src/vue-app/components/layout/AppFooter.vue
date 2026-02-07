<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="app-footer">
    <div class="footer-container container">
      <div class="footer-content">
        <div class="footer-left">
          <p class="footer-text">
            &copy; {{ currentYear }} Anselm Hahn. MIT Licensed.
          </p>
          <p class="footer-tagline">
            Built with <i class="pi pi-heart-fill"></i> for developers who code after dark <i class="pi pi-moon"></i>
          </p>
        </div>
        <div class="footer-links">
          <a 
            href="https://marketplace.visualstudio.com/items?itemName=anselmh.caligo-vscode-theme"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            <i class="pi pi-microsoft"></i>
            <span>Marketplace</span>
          </a>
          <a 
            href="https://github.com/Anselmoo/caligo-vscode-theme"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            <i class="pi pi-github"></i>
            <span>GitHub</span>
          </a>
          <a 
            href="https://github.com/Anselmoo/caligo-vscode-theme/blob/main/docs/ENHANCED_DOCUMENTATION.md"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            <i class="pi pi-book"></i>
            <span>Gallery</span>
          </a>
          <a 
            href="https://github.com/Anselmoo/caligo-vscode-theme/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            <i class="pi pi-users"></i>
            <span>Contributing</span>
          </a>
          <a 
            href="https://github.com/Anselmoo/caligo-vscode-theme/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            <i class="pi pi-file"></i>
            <span>License</span>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--bg0);
  border-top: 1px solid var(--border-color);
  padding: var(--space-xl) 0;
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.footer-text {
  color: var(--fg-muted);
  font-size: var(--text-sm);
}

.footer-tagline {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--fg-muted);
  font-size: var(--text-xs);
  font-style: italic;
}

.footer-tagline i.pi-heart-fill {
  color: var(--accent-alt, var(--accent));
  font-size: 12px;
}

.footer-tagline i.pi-moon {
  color: var(--accent);
  font-size: 12px;
}

.footer-links {
  display: flex;
  gap: var(--space-lg);
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--fg-muted);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
  text-decoration: none;
}

.footer-link i {
  font-size: 16px;
  transition: transform var(--transition-fast);
}

.footer-link:hover {
  color: var(--accent);
}

.footer-link:hover i {
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
  
  .footer-left {
    align-items: center;
  }
  
  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
