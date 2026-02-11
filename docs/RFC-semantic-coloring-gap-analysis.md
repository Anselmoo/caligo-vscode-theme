# RFC: Semantic Coloring Gap Analysis

## Expand tokenColors (11→40+) & semanticTokenColors (30→70+) to Match Dracula/GitHub Theme Quality

**Date:** 2026-02-11  
**Status:** Draft  
**Author:** Copilot Research Agent  

---

## Problem Statement

Caligo's auto-generated semantic coloring is **significantly weaker** than industry-standard themes. A direct comparison reveals critical gaps in both `tokenColors` (TextMate scopes) and `semanticTokenColors` (LSP semantic tokens) that make the theme feel _flat_ and _undifferentiated_ compared to Dracula, GitHub Theme, and Monokai.

---

## Quantitative Gap Summary

| Metric                        | Caligo (Current)                                                                  | Dracula                                                               | GitHub Theme       | Target                     |
| ----------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------ | -------------------------- |
| `tokenColors` scopes          | **11**                                                                            | **50+**                                                               | **25+**            | **40+**                    |
| `semanticTokenColors` entries | **~30**                                                                           | basic (relies on tokenColors)                                         | basic              | **70+**                    |
| Language-specific overrides   | **5** (Python, Rust, Java, Go, C#)                                                | **10+** via TextMate scopes                                           | via primer scales  | **10+**                    |
| Font style variations         | **3** (italic comments, bold declarations, strikethrough deprecated)              | **6+** (italic types/params/self, bold new/headings, underline links) | minimal            | **6+**                     |
| Distinct syntax color roles   | **8** (strings, numbers, keywords, functions, types, constants, attributes, tags) | **8** (Yellow, Green, Cyan, Pink, Purple, Orange, Red, FG)            | **7** color scales | **10+**                    |
| Variables coloring            | **`fg0` (plain foreground)**                                                      | **FG + params ORANGE**                                                | **`orange[2/6]`**  | **distinct harmony color** |

---

## Critical Gap Analysis (As-Is → To-Be)

### 1. Missing `tokenColors` Scope Categories

#### Comments Sub-Categories
Dracula dedicates 4 scopes to comment sub-types. Caligo has 1. GitHub Theme has 1 generic scope.

| Scope                                                                         | Dracula Color             | GitHub Theme                         | Caligo Target             |
| ----------------------------------------------------------------------------- | ------------------------- | ------------------------------------ | ------------------------- |
| `comment`, `punctuation.definition.comment`, `string.comment`                 | COMMENT (`#6272A4`)       | `gray[3]` (dark) / `gray[5]` (light) | `p.fgMuted`               |
| `comment.block.documentation keyword`                                         | PINK (`#FF79C6`)          | _(not scoped — inherits comment)_    | `syntax.attributes`       |
| `comment.block.documentation entity.name.type`                                | CYAN italic (`#8BE9FD`)   | _(not scoped)_                       | `syntax.types` italic     |
| `comment.block.documentation variable`                                        | ORANGE italic (`#FFB86C`) | _(not scoped)_                       | `syntax.variables` italic |
| `comment.block.documentation entity.name.type punctuation.definition.bracket` | CYAN (`#8BE9FD`)          | _(not scoped)_                       | `syntax.types`            |

> **Insight:** GitHub Theme takes a minimalist approach to comments — single gray tone, no JSDoc sub-scoping. Dracula is richest here. Caligo should follow Dracula for documentation-heavy languages.

#### String Sub-Categories
Dracula has 5 string-related scopes. Caligo has 1. GitHub Theme has 3 (strings, string variables, regexp).

| Scope                                                  | Dracula Color           | GitHub Theme                         | Caligo Target                       |
| ------------------------------------------------------ | ----------------------- | ------------------------------------ | ----------------------------------- |
| `string`, `string punctuation.section.embedded source` | RED (via comment)       | `blue[1]` (dark) / `blue[8]` (light) | `syntax.strings`                    |
| `string variable`                                      | —                       | `blue[2]` (dark) / `blue[6]` (light) | `syntax.variables`                  |
| `constant.character.escape`                            | PINK (`#FF79C6`)        | _(not scoped)_                       | `syntax.constants` (or accent)      |
| `punctuation.definition.template-expression.begin/end` | PINK (`#FF79C6`)        | _(not scoped)_                       | `p.accent`                          |
| `string.quoted.docstring.multi`                        | COMMENT (`#6272A4`)     | _(not scoped)_                       | `withAlpha(p.fgMuted, 0.75)`        |
| `punctuation.definition.string.begin/end`              | TEMP_QUOTES (`#E9F284`) | _(not scoped)_                       | `syntax.strings` (slightly shifted) |
| `constant.other.placeholder`, `constant.character`     | —                       | `red[3]` (dark) / `red[5]` (light)   | `syntax.constants`                  |

> **Insight:** GitHub Theme distinguishes `string variable` (interpolation targets) from plain strings — uses a brighter blue scale. Caligo should similarly differentiate template interpolation content.

#### Regex Sub-Components
Dracula has 7 regex-specific scopes. GitHub Theme has 3. Caligo has 0.

| Scope                                                                                                            | Dracula Color      | GitHub Theme                       | Caligo Target      |
| ---------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------- | ------------------ |
| `source.regexp`, `string.regexp`                                                                                 | YELLOW (`#F1FA8C`) | `blue[1]` (dark) — same as strings | `syntax.strings`   |
| `string.regexp.character-class`, `string.regexp constant.character.escape`, `string.regexp.arbitrary-repitition` | —                  | `blue[1]` (dark)                   | `syntax.types`     |
| `string.regexp constant.character.escape`                                                                        | —                  | `green[1]` (dark) **bold**         | `p.hueGreen` bold  |
| `punctuation.definition.group.regexp`                                                                            | ORANGE (`#FFB86C`) | _(not scoped)_                     | `syntax.constants` |
| `punctuation.definition.group.assertion.regexp`                                                                  | RED (`#FF5555`)    | _(not scoped)_                     | `p.hueRed`         |
| `punctuation.definition.character-class.regexp`                                                                  | CYAN (`#8BE9FD`)   | _(not scoped)_                     | `syntax.types`     |
| `string.regexp punctuation.definition.string.begin/end`                                                          | RED (`#FF5555`)    | _(not scoped)_                     | `p.hueRed`         |
| `meta.assertion.look-ahead.regexp`                                                                               | GREEN (`#50FA7B`)  | _(not scoped)_                     | `p.hueGreen`       |

> **Insight:** GitHub Theme treats regex like strings (same `blue[1]`), only differentiating escape chars in **bold green**. Dracula has the richest regex sub-scoping. Caligo should follow Dracula-level granularity for regex-heavy languages (JS/TS/Python/Ruby).

#### Keywords/Storage Subtypes
Dracula differentiates 5+ keyword subtypes. GitHub Theme groups keywords+storage under one red color. Caligo treats all keywords identically.

| Scope                                                  | Dracula          | GitHub Theme                                                | Caligo Target              |
| ------------------------------------------------------ | ---------------- | ----------------------------------------------------------- | -------------------------- |
| `keyword`                                              | PINK (`#FF79C6`) | `red[3]` (dark) / `red[5]` (light)                          | `syntax.keywords`          |
| `keyword.control.new` / `keyword.operator.new`         | PINK **bold**    | _(inherits `keyword` — `red[3]`)_                           | `syntax.keywords` **bold** |
| `storage.modifier`                                     | PINK             | `red[3]` (same as keyword)                                  | `syntax.keywords`          |
| `storage`, `storage.type`                              | PINK             | `red[3]` (same as keyword)                                  | `syntax.keywords`          |
| `storage.modifier.package/import`, `storage.type.java` | PINK             | **`fg.default`** (intentional reset!)                       | `syntax.keywords`          |
| `variable.language` (`this`/`self`/`super`)            | PURPLE italic    | `blue[2]` (via `variable.language` → constant/entity group) | `syntax.keywords` italic   |

> **Insight:** GitHub Theme intentionally resets Java import/package storage to foreground — avoiding red noise in import blocks. This is a smart edge case Caligo should consider. `variable.language` falls into their broad constant/entity bucket (`blue[2]`) rather than getting a unique treatment.

#### Functions Extended

| Scope                                     | Dracula           | GitHub Theme                             | Caligo Target                                      |
| ----------------------------------------- | ----------------- | ---------------------------------------- | -------------------------------------------------- |
| `entity.name.function`                    | GREEN (`#50FA7B`) | `purple[2]` (dark) / `purple[5]` (light) | `syntax.functions`                                 |
| `variable.parameter`                      | ORANGE italic     | **`fg.default`** (reset to foreground!)  | `syntax.variables` italic OR new `parameters` role |
| `variable.parameter.function`             | ORANGE italic     | **`fg.default`** (explicit reset)        | `syntax.variables` italic                          |
| `meta.decorator variable.other.readwrite` | GREEN italic      | _(not scoped)_                           | `syntax.attributes` italic                         |
| `meta.decorator variable.other.property`  | GREEN italic      | _(not scoped)_                           | `syntax.attributes` italic                         |

> **Insight:** GitHub Theme makes the controversial choice of resetting function parameters to plain foreground — treating them as "noise". Dracula gives them a distinct ORANGE italic. Caligo should follow Dracula here: parameters ARE semantically important and deserve distinction.

#### Types Extended

| Scope                                | Dracula     | GitHub Theme                                          | Caligo Target         |
| ------------------------------------ | ----------- | ----------------------------------------------------- | --------------------- |
| `entity.other.inherited-class`       | CYAN italic | _(not scoped)_                                        | `syntax.types` italic |
| `entity.name.type.type-parameter`    | ORANGE      | _(not scoped)_                                        | `p.accentMuted`       |
| `storage.type.*` (language-specific) | CYAN italic | `red[3]` (grouped with storage — no type distinction) | `syntax.types` italic |

> **Insight:** GitHub Theme does NOT differentiate types from storage — both get `red[3]`. This is a notable weakness in their approach. Dracula's CYAN italic for types is significantly more readable. Caligo's harmony-based `syntax.types` role is already better-positioned.

#### Properties & Support (Language Built-ins)

| Scope                               | Dracula          | GitHub Theme                                         | Caligo Target         |
| ----------------------------------- | ---------------- | ---------------------------------------------------- | --------------------- |
| `support` (base)                    | CYAN italic      | `blue[2]` (dark) / `blue[6]` (light)                 | `syntax.types` italic |
| `support.function`                  | CYAN (regular)   | _(inherits `support` — `blue[2]`)_                   | `syntax.functions`    |
| `support.constant`                  | —                | `blue[2]` (explicit)                                 | `syntax.constants`    |
| `support.variable`                  | PURPLE (regular) | `blue[2]` (same as support base)                     | `syntax.constants`    |
| `support.function.magic`            | PURPLE (regular) | _(inherits support)_                                 | `syntax.constants`    |
| `support.type.property-name`        | —                | _(not scoped directly)_                              | `syntax.attributes`   |
| `support.type.property-name.json`   | —                | `green[1]` (dark) / `green[6]` (light) — **unique!** | `syntax.attributes`   |
| `meta.property-name`                | —                | `blue[2]` (dark) / `blue[6]` (light) — CSS props     | `syntax.attributes`   |
| `meta.module-reference`             | —                | `blue[2]`                                            | `syntax.types`        |
| `variable.other.constant.js/ts/tsx` | FG               | _(inherits `variable.other` → `fg.default`)_         | `syntax.constants`    |

> **Insight:** GitHub Theme gives JSON property names a distinct `green[1]` — the only serialization-specific scope they have. CSS properties get `blue[2]` via `meta.property-name`. All other `support.*` variants collapse to the same `blue[2]`. Caligo should differentiate more finely here.

#### Markup/Prose (Markdown, RST)
Dracula has 12+ prose scopes. GitHub Theme has 11+ with backgrounds for diffs. Caligo has 0.

| Scope                                                | Dracula       | GitHub Theme                        | Caligo Target         |
| ---------------------------------------------------- | ------------- | ----------------------------------- | --------------------- |
| `markup.heading`, `markup.heading entity.name`       | PURPLE bold   | `blue[2]` **bold**                  | `p.accent` bold       |
| `markup.bold`                                        | ORANGE bold   | `fg.default` **bold** (no color!)   | `p.hueOrange` bold    |
| `markup.italic`                                      | YELLOW italic | `fg.default` **italic** (no color!) | `p.hueYellow` italic  |
| `markup.underline`                                   | —             | **underline** (no color)            | underline             |
| `markup.strikethrough`                               | —             | **strikethrough** (no color)        | strikethrough         |
| `markup.underline.link`                              | CYAN          | _(not scoped)_                      | `p.hueCyan`           |
| `markup.inline.raw`                                  | GREEN         | `blue[2]`                           | `syntax.strings`      |
| `markup.quote`                                       | YELLOW italic | `green[1]`                          | `p.hueYellow` italic  |
| `markup.inserted`                                    | GREEN         | `green[1]` + bg:`green[9]` (dark)   | `p.hueGreen`          |
| `markup.deleted`                                     | RED           | `red[2]` + bg:`red[9]` (dark)       | `p.hueRed`            |
| `markup.changed`                                     | ORANGE        | `orange[2]` + bg:`orange[8]` (dark) | `p.hueOrange`         |
| `markup.ignored`, `markup.untracked`                 | —             | `gray[8]` + bg:`blue[2]` (dark)     | `p.fgMuted`           |
| `beginning.punctuation.definition.list.markdown`     | CYAN          | `orange[2]`                         | `p.hueCyan`           |
| `constant.other.reference.link`, `string.other.link` | —             | `blue[1]` (dark)                    | `p.hueCyan` underline |

> **Insight:** GitHub Theme uses **background colors** for diff markup (inserted/deleted/changed) — a pattern Caligo could adopt for richer Markdown diff previews. However, GitHub Theme strips color from bold/italic markup (rendering in FG), while Dracula colors them. Caligo should follow Dracula's approach for richer prose rendering.

#### Serialization Languages (YAML, TOML, JSON, Makefile)
Dracula has 4+ serialization scopes. GitHub Theme has 1 (JSON-specific). Caligo has 0.

| Scope                                              | Dracula                | GitHub Theme                           | Caligo Target                     |
| -------------------------------------------------- | ---------------------- | -------------------------------------- | --------------------------------- |
| `support.type.property-name.json`                  | —                      | `green[1]` (dark) / `green[6]` (light) | `syntax.attributes`               |
| `entity.name.tag.yaml` / `variable.other.key.toml` | CYAN                   | _(not scoped)_                         | `syntax.types`                    |
| `constant.other.date/timestamp`                    | ORANGE                 | _(not scoped)_                         | `syntax.numbers`                  |
| `variable.other.alias.yaml`                        | GREEN italic underline | _(not scoped)_                         | `syntax.strings` italic underline |
| `entity.name.function.target.makefile`             | CYAN                   | _(not scoped)_                         | `syntax.functions`                |

> **Insight:** GitHub Theme's only serialization distinction is JSON properties in `green[1]`. YAML/TOML/Makefile get no special treatment. Dracula is richer here. Caligo should at minimum match GitHub's JSON approach and add YAML key scoping.

#### Invalid/Deprecated
Dracula has 2 invalid scopes. GitHub Theme has 4 sub-types + message.error.

| Scope                   | Dracula              | GitHub Theme                               | Caligo Target                       |
| ----------------------- | -------------------- | ------------------------------------------ | ----------------------------------- |
| `invalid`               | RED underline italic | _(see sub-types below)_                    | `p.semantic.error` underline italic |
| `invalid.broken`        | —                    | `red[2]` italic                            | `p.semantic.error` italic           |
| `invalid.deprecated`    | FG underline italic  | `red[2]` italic                            | `p.fgMuted` underline italic        |
| `invalid.illegal`       | —                    | `red[2]` italic                            | `p.semantic.error` italic underline |
| `invalid.unimplemented` | —                    | `red[2]` italic                            | `p.semantic.warning` italic         |
| `message.error`         | —                    | `red[2]`                                   | `p.semantic.error`                  |
| `carriage-return`       | —                    | `gray[0]` on `red[3]` bg, italic underline | `p.semantic.error` bg               |

> **Insight:** GitHub Theme provides the most granular invalid handling with 4 sub-types. The `carriage-return` scope with a red background + content replacement (`^M`) is a unique pattern worth studying. Caligo should implement all 4 invalid sub-types.

#### Punctuation Distinction

| Scope                                          | Dracula | GitHub Theme                       | Caligo Target           |
| ---------------------------------------------- | ------- | ---------------------------------- | ----------------------- |
| Separators (key-value, namespace, inheritance) | PINK    | _(not scoped)_                     | `p.accent`              |
| Template/interpolation operators               | PINK    | _(not scoped)_                     | `p.accent`              |
| `punctuation.section.embedded`                 | —       | `red[3]` (dark) / `red[5]` (light) | `p.accent`              |
| `punctuation.definition.list.begin.markdown`   | —       | `orange[2]` (dark)                 | `p.hueCyan`             |
| Brackets/braces/parens                         | FG      | _(not scoped — inherits FG)_       | `p.fg0` (current is OK) |
| Bracket highlighter (unmatched)                | —       | `red[2]`                           | `p.semantic.error`      |
| Bracket highlighter (matched)                  | —       | `gray[3]`                          | `p.fgMuted`             |

> **Insight:** GitHub Theme scopes `punctuation.section.embedded` (template literal delimiters) with keyword-red — a useful visual anchor. Their bracket highlighter integration with gray/red tones is also notable. Caligo should scope embedded section punctuation distinctly.

---

### 2. Missing `semanticTokenColors` Entries

#### Event & Label tokens
```
event → p.fgMuted
label → p.harmony.keywords
```

#### Language-Scoped Overrides (biggest gap vs GitHub Theme)
```
"variable:typescript": p.harmony.variables
"variable:javascript": p.harmony.variables
"property:css": syntax.attributes
"property:scss": syntax.attributes
"variable.readonly:typescript": { foreground: p.harmony.constants, fontStyle: "bold" }
"function.defaultLibrary:typescript": { foreground: p.harmony.functions, fontStyle: "bold" }
"class.defaultLibrary:typescript": { foreground: p.harmony.types, fontStyle: "bold" }
"variable.defaultLibrary:javascript": { foreground: p.harmony.constants, fontStyle: "bold" }
"type:typescript": p.harmony.types
"enumMember:typescript": p.harmony.constants
"parameter:python": { foreground: p.harmony.variables, fontStyle: "italic" }
```

#### Missing Modifier Combinations
```
"*.static": { fontStyle: "underline" }
"*.abstract": { fontStyle: "italic" }
"*.modification": { foreground: p.harmony.variables }  // distinct from read
"*.documentation": { fontStyle: "italic" }
"function.defaultLibrary": { foreground: p.harmony.functions, fontStyle: "bold" }
"class.defaultLibrary": { foreground: p.harmony.types, fontStyle: "bold" }
```

---

### 3. Variables MUST Get a Distinct Color

**THE SINGLE BIGGEST QUALITY GAP.**

**Current state** (`src/lib/vscode-theme.ts`):
```typescript
{
  name: "Variables",
  scope: ["variable", "support.variable", "variable.parameter", ...],
  settings: { foreground: p.fg0 },  // ← PLAIN FOREGROUND!
}
```

**Comparison across themes:**
| Token                                      | Caligo           | Dracula                   | GitHub Theme                          |
| ------------------------------------------ | ---------------- | ------------------------- | ------------------------------------- |
| `variable`                                 | `fg0` (plain FG) | FG (`#F8F8F2`)            | `orange[2]` — **distinct color!**     |
| `variable.other`                           | `fg0`            | FG                        | `fg.default` (reset to FG)            |
| `variable.parameter`                       | `fg0`            | ORANGE italic (`#FFB86C`) | `fg.default` (reset to FG)            |
| `variable.language` (`this`/`self`)        | `fg0`            | PURPLE italic (`#BD93F9`) | `blue[2]` (via constant/entity group) |
| `variable.other.constant`                  | `fg0`            | FG                        | `blue[2]` (via constant group)        |
| `variable.other.enummember`                | `fg0`            | —                         | `blue[2]` (via constant group)        |
| `entity.name` / `meta.definition.variable` | `fg0`            | —                         | `orange[2]` (definition emphasis)     |

> **Key finding:** GitHub Theme gives `variable` a distinct `orange[2]` but then RESETS `variable.other` back to foreground — creating a scoping cascade where only "bare" variables (params, function-scope) get orange. This is a nuanced approach: definitions get orange, usages get FG. Dracula colors only parameters distinctly (ORANGE italic). **Caligo currently gives no variable any distinct color at all — this is the single most impactful fix.**

**Required change:**
```typescript
{
  name: "Variables",
  scope: ["variable", "support.variable", "variable.other.readwrite", "meta.definition.variable"],
  settings: { foreground: syntax.variables },  // Use harmony.variables
},
{
  name: "Function Parameters",
  scope: ["variable.parameter", "entity.name.variable.parameter"],
  settings: { foreground: syntax.variables, fontStyle: "italic" },
},
{
  name: "this/self/super",
  scope: ["variable.language", "keyword.other.this"],
  settings: { foreground: syntax.keywords, fontStyle: "italic" },
},
```

---

### 4. Missing `fontStyle` Differentiation

| Element               | Current | Dracula          | GitHub Theme                     | Target              |
| --------------------- | ------- | ---------------- | -------------------------------- | ------------------- |
| `this`/`self`/`super` | none    | italic + purple  | none (falls into constant group) | italic + keywords   |
| Function parameters   | none    | italic + orange  | none (reset to FG)               | italic + variables  |
| Inherited classes     | none    | italic + cyan    | none                             | italic + types      |
| Type annotations      | none    | italic + cyan    | none                             | italic + types      |
| Built-in support      | none    | italic + cyan    | none                             | italic + bold       |
| `new` keyword         | none    | bold             | none                             | bold                |
| Decorators            | none    | italic + green   | none                             | italic + attributes |
| Storage modifiers     | none    | pink             | none (same as keyword)           | keywords color      |
| Invalid scopes        | none    | underline italic | **italic** (all 4 sub-types)     | underline italic    |
| Regex escape chars    | none    | —                | **bold** (`green[1]`)            | bold                |
| Markup headings       | none    | bold             | **bold** (`blue[2]`)             | bold                |
| Diff ranges           | none    | —                | **bold** (`purple[2]`)           | bold                |

> **Insight:** GitHub Theme uses font styles very sparingly — italic only for invalid scopes, bold for headings/regex/diffs. Dracula is significantly richer in font style usage. Caligo should follow Dracula's font style depth while potentially borrowing GitHub's bold-for-regex-escape pattern.

---

## SWOT Analysis

### Strengths
- **OKLCH harmony system** — auto-generates perceptually uniform, accessible colors
- **Intent layer engine** — semantically-aware color mapping (declaration/mutation/usage)
- **Contrast guarantees** — APCA contrast loop ensures readability
- **Multi-harmony modes** — analogous, triadic, split-complementary, monochromatic
- **Existing 8 syntax color roles** map cleanly to expanded scopes

### Weaknesses
- **Severely limited tokenColors** (11 vs. 50+ needed for language-specific nuance)
- **Variables render as plain foreground** — zero visual distinction from surrounding text
- **No prose/markdown/RST scopes** — no rich rendering of documentation files
- **No regex/escape/interpolation sub-components** — everything that's a string looks identical
- **Minimal font style usage** — only comments get italic; no bold/italic/underline for params, types, this/self, decorators
- **No serialization language support** — YAML keys, TOML sections, JSON properties all look the same as code

### Opportunities
- All fixes maintain OKLCH auto-generation — use existing `p.harmony.*` and `p.hue*` slots
- Can add 30+ tokenColors from the existing palette without needing new color derivation
- `semanticTokenColors` language overrides are pure configuration — no color generation change needed
- Font styles (italic, bold, underline, strikethrough) are free — zero color cost

### Threats
- Scope explosion complexity — must be tested across 10+ languages
- Edge case regressions — some scopes interact unexpectedly across grammars
- Maintenance burden — more scopes = more tests needed in CI

---

## Implementation Strategy (3 Phases)

### Phase 1: Critical Foundations (Sprint 1)
1. **Fix variables color** — change `p.fg0` → `syntax.variables` in tokenColors
2. **Separate parameters** — `variable.parameter` gets own scope with italic + harmony.variables
3. **Add `this`/`self`/`super`** scope with italic + keywords color
4. **Add escape sequences** scope → harmony.constants with pink/accent tint
5. **Add template interpolation** scopes
6. **Add `invalid`/`invalid.deprecated`** scopes
7. **Add `storage`/`storage.modifier`** scope
8. **Add `keyword.control.new`** scope with bold

### Phase 2: Rich Language Support (Sprint 2)
1. **JSDoc/docstring sub-scopes** (keyword, type, parameter)
2. **Regex sub-components** (5 scopes)
3. **Markup/prose** (headings, bold, italic, links, code, quotes, diffs)
4. **Serialization** (YAML, TOML, JSON, Makefile keys/dates)
5. **CSS/SCSS properties**
6. **Language built-ins** (`support`, `support.function`, `support.variable`)
7. **Inherited classes and generics** (italic + types)

### Phase 3: Semantic Token Expansion (Sprint 3)
1. **Language-scoped semanticTokenColors** for TypeScript, JavaScript, Python, CSS, HTML
2. **Modifier combinations** (static, abstract, modification, documentation)
3. **Event and label tokens**
4. **defaultLibrary overrides** for functions, classes, variables
5. **Test coverage** across all 10 supported language mappers

---

## Files to Modify

| File                                        | Change Type | Description                                                 |
| ------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `src/lib/vscode-theme.ts`                   | **Major**   | tokenColors array expansion (11→40+)                        |
| `src/lib/semantic-tokens.ts`                | **Major**   | semanticTokenColors expansion (30→70+)                      |
| `src/lib/harmony-colors.ts`                 | **Minor**   | Potentially add `parameters` role distinct from `variables` |
| `src/lib/__tests__/vscode-theme.test.ts`    | **Medium**  | Test coverage for new scopes                                |
| `src/lib/__tests__/semantic-tokens.test.ts` | **Medium**  | Test coverage for new semantic entries                      |

---

## Appendix: GitHub Theme (primer) Color Scale Reference

GitHub Theme uses `@primer/primitives` color scales. Dark mode values used in tokenColors:

| Scale             | Dark Value Pattern | Used For                                                                                                    |
| ----------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `scale.gray[3]`   | Muted gray         | Comments                                                                                                    |
| `scale.gray[0]`   | White              | Carriage-return FG                                                                                          |
| `scale.red[3]`    | Warm red           | Keywords, storage, placeholders, embedded punctuation                                                       |
| `scale.red[2]`    | Lighter red        | Invalid (all 4 sub-types), message.error                                                                    |
| `scale.blue[2]`   | Mid blue           | Constants, entities, support, meta.property-name, headings, inline.raw, module-reference                    |
| `scale.blue[1]`   | Light blue         | Strings, regexp, links                                                                                      |
| `scale.orange[2]` | Warm orange        | Entity names, variable definitions, `meta.definition.variable`, list punctuation, diff changed              |
| `scale.purple[2]` | Soft purple        | Function names, diff ranges                                                                                 |
| `scale.green[1]`  | Light green        | Tags, components, quotes, regex escape (bold), inserted, JSON properties                                    |
| `fg.default`      | Foreground         | Parameters (reset), `variable.other` (reset), JSX children, meta blocks, bold/italic markup, import storage |

**Design philosophy:** GitHub Theme uses a **7-color system** with aggressive FG resets for "noise" elements (parameters, meta blocks, variable usages). This creates a clean but less colorful result compared to Dracula. Key differentiators:
1. **FG resets** — Parameters, `variable.other`, JSX children, and import storage are intentionally de-emphasized to foreground
2. **Background colors** for diff markup — `inserted`/`deleted`/`changed` get tinted backgrounds
3. **Single red for keywords+storage** — No differentiation between `keyword` and `storage.type`
4. **No JSDoc sub-scoping** — All comment content is uniform gray
5. **JSON-specific green** — `support.type.property-name.json` is the only serialization-specific scope
6. **4 invalid sub-types** — More granular error classification than Dracula

---

## References

- [VS Code Semantic Highlight Guide](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide)
- [Dracula theme source (50+ tokenColors)](https://github.com/dracula/visual-studio-code/blob/main/src/dracula.yml)
- [GitHub Theme source (primer scales)](https://github.com/primer/github-vscode-theme/blob/main/src/theme.js)
- [GitHub Theme colors.js (primer primitives)](https://github.com/primer/github-vscode-theme/blob/main/src/colors.js)
- [VS Code Standard Semantic Token Types](https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide#standard-token-types-and-modifiers)
- [TextMate Scope Naming Conventions](https://macromates.com/manual/en/language_grammars#naming-conventions)
