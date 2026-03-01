export interface ThemeTokenColor {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    fontStyle?: string;
  };
}

export interface ThemeSemanticTokenEntry {
  foreground?: string;
}

export interface ThemeTokenColorSource {
  tokenColors?: ThemeTokenColor[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, string | ThemeSemanticTokenEntry>;
}

function getTokenColor(theme: ThemeTokenColorSource, scopes: string[]): string | undefined {
  if (!theme.tokenColors) return undefined;

  for (const tc of theme.tokenColors) {
    if (!tc.scope || !tc.settings?.foreground) continue;
    const tcScopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
    for (const scope of scopes) {
      if (tcScopes.some(s => s === scope || s.startsWith(`${scope}.`))) {
        return tc.settings.foreground;
      }
    }
  }
  return undefined;
}

function getSemanticTokenColor(
  theme: ThemeTokenColorSource,
  selectors: string[]
): string | undefined {
  if (!theme.semanticHighlighting || !theme.semanticTokenColors) return undefined;

  for (const selector of selectors) {
    const match = theme.semanticTokenColors[selector];
    if (!match) continue;
    if (typeof match === "string") return match;
    if (match.foreground) return match.foreground;
  }
  return undefined;
}

export function resolveTokenColor(
  theme: ThemeTokenColorSource,
  semanticSelectors: string[],
  textmateScopes: string[],
  fallback: string
): string {
  return (
    getSemanticTokenColor(theme, semanticSelectors) ||
    getTokenColor(theme, textmateScopes) ||
    fallback
  );
}
