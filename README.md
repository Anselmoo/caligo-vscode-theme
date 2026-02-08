<p align="center">
  <img src="images/banner.png" alt="Caligo banner preview" width="100%">
</p>

<h1 align="center">Caligo</h1>

<p align="center">
  <strong>50 perceptually uniform dark themes built on OKLCH color science</strong><br>
  10 seed palettes × 5 harmony modes
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme"><strong>Install</strong></a>
  · <a href="https://anselmoo.github.io/caligo-vscode-theme/#/"><strong>Live Preview</strong></a>
  · <a href="https://anselmoo.github.io/caligo-vscode-theme/#/gallery"><strong>Gallery</strong></a>
  · <a href="CONTRIBUTING.md"><strong>Contribute</strong></a>
  · <a href="QUICKSTART.md"><strong>Quick Start</strong></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme">
    <img src="https://img.shields.io/visual-studio-marketplace/v/AnselmHahn.caligo-vscode-theme?style=flat-square&label=Marketplace&color=007acc" alt="VS Marketplace">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme">
    <img src="https://img.shields.io/visual-studio-marketplace/i/AnselmHahn.caligo-vscode-theme?style=flat-square&label=Installs&color=007acc" alt="Installs">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/Anselmoo/caligo-vscode-theme?style=flat-square&color=007acc" alt="License">
  </a>
  <a href="https://github.com/Anselmoo/caligo-vscode-theme/actions/workflows/cicd.yml">
    <img src="https://github.com/Anselmoo/caligo-vscode-theme/actions/workflows/cicd.yml/badge.svg" alt="CI">
  </a>
</p>

---

## What is Caligo?

Caligo is a **professional dark theme collection** for Visual Studio Code, built on color science principles. Unlike traditional hand-picked color schemes, Caligo uses **OKLCH** — a perceptually uniform color space — to generate mathematically harmonious themes that are easy on the eyes and maintain consistent readability.

Choose from **50 carefully crafted themes**: 10 distinctive seed palettes × 5 color harmony variants.

## Why Caligo?

### 🔬 OKLCH Color Science

Traditional themes rely on trial-and-error hex codes. Caligo leverages **OKLCH** for predictable, perceptually uniform colors:

- **Consistent brightness** — Colors at equal lightness values look equally bright
- **Preserved readability** — Harmony transformations maintain contrast ratios
- **Mathematical precision** — "Colors that look equally different, are equally different"

### ✨ Key Features

- **50 themes** from 10 seed palettes × 5 color harmonies
- **High contrast** — designed with accessibility in mind using APCA-W3 contrast validation
- **Semantic highlighting** — intent-aware colors for declarations, mutations, control flow
- **Consistent syntax** — harmonized bracket pairs, git diff, and terminal colors
- **Zero configuration** — works beautifully out of the box

### 🎯 Semantic Highlighting

Beyond basic syntax colors, Caligo provides intent-based highlighting:

| Intent       | Purpose       | Examples                     |
| ------------ | ------------- | ---------------------------- |
| Declaration  | Definitions   | `const`, `function`, `class` |
| Mutation     | State changes | `=`, `++`, `--`              |
| Control Flow | Logic         | `if`, `for`, `return`        |
| Data         | Values        | Literals, constants          |

*Requires language server support (TypeScript, Python/Pylance, Rust, etc.)*

## 📦 Installation

1. Open **Extensions** (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for **"Caligo"**
3. Click **Install**
4. Open Command Palette → **Preferences: Color Theme** → Select any Caligo theme

Or from command line:
```bash
code --install-extension AnselmHahn.caligo-vscode-theme
```

## 🖼️ Theme Gallery

<div align="center">
  <p>
    <img src="images/icon.png" alt="Caligo Icon" width="88" height="88">
  </p>

  <table>
    <tr>
      <td align="center" width="33%">
        <img src="https://anselmoo.github.io/caligo-vscode-theme/screenshots/caligo-aurora-noir-balanced-typescript.png" width="100%" alt="Aurora Noir">
        <br><strong>Aurora Noir</strong>
      </td>
      <td align="center" width="33%">
        <img src="https://anselmoo.github.io/caligo-vscode-theme/screenshots/caligo-eclipse-balanced-typescript.png" width="100%" alt="Eclipse">
        <br><strong>Eclipse</strong>
      </td>
      <td align="center" width="33%">
        <img src="https://anselmoo.github.io/caligo-vscode-theme/screenshots/caligo-mandarian-balanced-typescript.png" width="100%" alt="Mandarian">
        <br><strong>Mandarian</strong>
      </td>
    </tr>
  </table>

  <p>
    <a href="https://anselmoo.github.io/caligo-vscode-theme/#/gallery"><strong>→ Browse all 50 themes</strong></a>
  </p>
</div>

### Seed Palettes

Each palette is designed to evoke a distinct visual character and mood:

| Palette              | Character                              |
| -------------------- | -------------------------------------- |
| **Aurora Noir**      | Cyan-teal aurora over deep ocean       |
| **Cinder**           | Warm amber glow from smoldering embers |
| **Deep Sable**       | Rich earth tones with deep warmth      |
| **Eclipse**          | Solar corona against void black        |
| **Graphite Flux**    | Industrial steel with electric accents |
| **Mandarian**        | Vibrant citrus energy                  |
| **Midnight Atelier** | Artist's studio at night               |
| **Nebula Night**     | Cosmic dust and starlight              |
| **Obsidian Glow**    | Volcanic glass with inner fire         |
| **Void Ember**       | Smoldering darkness                    |

Each palette has 5 harmony variants: **Balanced**, **Analogous**, **Triadic**, **Split-Complementary**, **Monochromatic**

---

## 📚 More Info

- [**Web Gallery**](https://anselmoo.github.io/caligo-vscode-theme/) — Interactive theme browser
- [**Contributing**](CONTRIBUTING.md) — Development setup & guidelines
- [**Quick Start**](QUICKSTART.md) — Developer quick start guide

<br>

<div align="center">
  <hr>
  <br>
  <p>
    &copy; 2026 Anselm Hahn. MIT Licensed.
  </p>
  <p>
    Built with ❤️ for developers who code after dark 🌙
  </p>
  <p>
    <a href="https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme">Marketplace</a> •
    <a href="https://github.com/Anselmoo/caligo-vscode-theme">GitHub</a> •
    <a href="https://anselmoo.github.io/caligo-vscode-theme/#/gallery">Gallery</a> •
    <a href="CONTRIBUTING.md">Contributing</a> •
    <a href="LICENSE">License</a>
  </p>
</div>
