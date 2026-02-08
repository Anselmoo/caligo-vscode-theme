# GitHub Social Card

This directory contains the GitHub repository social card with a 40pt safe margin.

## Files

- `social-card.svg` - Source SVG file (1280×640px) with 40pt safe margin
- `social-card.png` - Generated PNG for GitHub (1280×640px)

## Safe Margin Specification

Following GitHub's Repo Card Template guidance:

> "We recommend leaving a 40pt border around the important details of your social card to make sure nothing gets cropped."

**Safe Margin Details:**
- Total size: 1280×640 pixels (GitHub's recommended social card dimensions)
- Safe margin: 40pt (~53 pixels at 96 DPI)
- Content area: 1174×534 pixels (within safe boundaries)
- All text and important graphics positioned within the safe area

## Generation

To regenerate the social card PNG from the SVG:

```bash
npm run images:social-card
```

This script uses available system tools in order of preference:
1. ImageMagick (`convert`)
2. librsvg (`rsvg-convert`)
3. Inkscape
4. sips (macOS only)

## Using as GitHub Repository Social Card

To use this image as your GitHub repository's social card:

1. Go to your repository on GitHub
2. Navigate to Settings → General
3. Scroll down to "Social preview"
4. Click "Edit" and upload `images/social-card.png`

GitHub will automatically display this image when your repository is shared on social media platforms, embedded in Discord, Slack, or other services that support Open Graph previews.

## Design Elements

The social card includes:
- Background gradient matching the theme aesthetic
- Caligo logo (positioned within safe margin)
- Title: "Caligo"
- Subtitle: "Perceptual Dark Themes"
- Additional info: "OKLCH Color Harmony • 50 Themes"
- Safe margin boundary indicator (dashed outline, can be removed if desired)

All elements are positioned to respect the 40pt safe zone, ensuring nothing important gets cropped when displayed across different platforms.
