## Plan: Improve wallpaper naturalness

Audit why exported wallpapers feel more synthetic than the web presentation, then adjust composition, motion cues, depth layering, and presentation framing in the wallpaper pipeline rather than only polishing the gallery UI.

**Steps**
1. Compare the specific motifs that look weakest first, starting with `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/motifs/aurora-noir.ts`, to identify whether the issue is composition, color, or texture density.
2. Rebalance motif composition in `auroraAdvancedBrick`, terrain bricks, and atmosphere layers so bands, fog, and terrain have more irregular spacing and clearer focal hierarchy. This blocks later tuning because export output quality depends on the base composition.
3. Reduce synthetic cues in procedural layers by revisiting turbulence frequency, blur radii, opacity stacking, particle distribution, and repeated contour smoothness in the wallpaper brick files under `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/bricks/`. This can run in parallel with step 4.
4. Improve palette realism by slightly muting or weathering selected highlight colors during wallpaper extraction in `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/renderer.ts` or motif-specific color choices. This can run in parallel with step 3.
5. Revisit platform-specific composition using `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/types.ts` and motif layout parameters so monitor, tablet, and mobile variants do not inherit the same density and horizon placement.
6. Align export presentation with the stronger web experience by deciding whether wallpapers should stay raw image assets or receive optional framing/post-processing similar to the gallery card treatment in `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/vue-app/components/wallpapers/WallpaperCard.vue` and supporting styles.
7. Validate changes with side-by-side comparisons in the wallpapers view and regenerated outputs from the existing generation flow before making broader motif updates.

**Relevant files**
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/renderer.ts` — palette extraction, final SVG assembly, text injection.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/motifs/aurora-noir.ts` — concrete example of the attached aurora variants and their layer ordering.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/bricks/atmosphere.ts` — fog, tone curve, and blend behavior that strongly affect naturalness.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/bricks/landscape.ts` — terrain, contour, reflection, aurora, and star generation.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/bricks/noise.ts` — grain and turbulence texture sources.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/wallpaper/types.ts` — platform viewBox sizing and composition constraints.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/vue-app/components/wallpapers/WallpaperCard.vue` — preview framing, `aspect-ratio`, `object-fit`, and card styling that improve perceived quality.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/vue-app/views/WallpapersView.vue` — gallery grid density and page framing.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/vue-app/styles/reset.css` — browser text/image smoothing defaults.
- `/Users/hahn/LocalDocuments/GitHub_Forks/caligo-vscode-theme/src/vue-app/components/layout/AuroraBackground.vue` — animated blurred gradient treatment used elsewhere on the site.

**Verification**
1. Capture side-by-side before/after screenshots for the same seed, harmony mode, and platform in the wallpapers gallery.
2. Check monitor, tablet, and mobile variants separately so composition changes do not only improve the 16:9 case.
3. Review whether focal points remain readable without the gallery card chrome or surrounding UI.
4. Confirm that improvements are visible in both raw SVG viewing and in-browser preview, not only inside the site layout.

**Decisions**
- Included: analysis of why exported wallpapers feel less natural and why the site presentation feels stronger.
- Excluded: implementation changes, test execution, and build regeneration in this planning session.
- Key finding: the webpage is not necessarily using a fundamentally better wallpaper asset; the same SVG benefits from stronger framing, constrained aspect ratio, smoothing defaults, motion, and surrounding UI context.

**Further Considerations**
1. Decide whether the goal is realistic natural landscapes or stylized synthetic art. Recommendation: keep the stylized identity, but remove the most obviously procedural cues.
2. Decide whether exported wallpapers should remain pure SVG outputs or whether a raster-first export path with subtle post-processing is acceptable. Recommendation: keep SVG source of truth, allow optional raster polish for downloads if visual quality is the priority.
3. Decide whether mobile variants should use motif-specific layouts rather than simple platform resizing. Recommendation: yes, because the portrait compositions in the screenshots are currently the weakest.
