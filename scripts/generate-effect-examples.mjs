import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const examplesDir = path.join(root, "examples");
const effectsDir = path.join(examplesDir, "effects");

const groups = [
  {
    name: "Single Effects",
    items: [
      "Soft Gaussian blur",
      "Heavy background blur",
      "Frosted glass blur",
      "Motion blur streak",
      "Zoom blur burst",
      "Radial blur halo",
      "Edge blur fade",
      "Tilt-shift blur",
      "Bokeh blur field",
      "Haze blur wash",
      "Linear gradient fade",
      "Radial gradient bloom",
      "Angular gradient spin",
      "Sunset gradient sweep",
      "Neon gradient band",
      "Metallic gradient sheen",
      "Duotone gradient fill",
      "Pastel gradient mist",
      "Dark-to-light gradient lift",
      "Multi-stop aurora gradient",
      "Soft glow",
      "Outer glow ring",
      "Inner glow pulse",
      "Neon glow edge",
      "Warm bloom glow",
      "Cold cyan glow",
      "Shadow glow mix",
      "Backlight glow",
      "Halo light burst",
      "Diffused light leak",
      "Drop shadow",
      "Long shadow",
      "Soft ambient shadow",
      "Hard cast shadow",
      "Colored shadow",
      "Double shadow",
      "Floating shadow",
      "Directional shadow",
      "Inner shadow",
      "Shadow vignette",
      "Film grain",
      "Dust noise",
      "Static noise",
      "Fine texture grain",
      "Speckled grain",
      "Paper grain",
      "Canvas texture",
      "Sand texture",
      "Frost texture",
      "Smoke texture",
      "Vignette darkening",
      "Bright vignette",
      "Color vignette",
      "Oval vignette",
      "Cinematic vignette",
      "Feathered vignette",
      "Tunnel vignette",
      "Spotlight vignette",
      "Reverse vignette",
      "Corner vignette",
      "Ripple distortion",
      "Water wave distortion",
      "Heat distortion",
      "Glass warp",
      "Fisheye distortion",
      "Wobble distortion",
      "Melt distortion",
      "Refraction distortion",
      "Prism split",
      "Mirage distortion",
      "Pixelation",
      "Mosaic tiles",
      "CRT scanlines",
      "VHS jitter",
      "RGB channel shift",
      "Chromatic aberration",
      "Posterize effect",
      "Threshold effect",
      "Invert effect",
      "Solarize effect",
      "Emboss effect",
      "Bevel effect",
      "Satin effect",
      "Gloss overlay",
      "Metallic shine",
      "Pearl shimmer",
      "Holographic sheen",
      "Mirror reflection",
      "Wet surface shine",
      "Ice crystal shine",
      "Light rays",
      "Sunburst rays",
      "Volumetric beams",
      "Lens flare",
      "Star sparkle",
      "Glint highlight",
      "Flare streak",
      "Spark drift",
      "Aurora curtain",
      "Smoke plume",
    ],
  },
  {
    name: "Multi Effects",
    items: [
      "Gradient + blur",
      "Gradient + glow",
      "Gradient + grain",
      "Gradient + vignette",
      "Gradient + shadow",
      "Gradient + ripple",
      "Gradient + bloom",
      "Gradient + scanlines",
      "Gradient + chromatic shift",
      "Gradient + metallic sheen",
      "Blur + glow",
      "Blur + shadow",
      "Blur + grain",
      "Blur + vignette",
      "Blur + lens flare",
      "Blur + ripple",
      "Blur + noise + glow",
      "Blur + duotone gradient",
      "Blur + RGB split",
      "Blur + glass warp",
      "Glow + grain",
      "Glow + shadow",
      "Glow + vignette",
      "Glow + flare",
      "Glow + sparkle",
      "Glow + smoke",
      "Glow + prism split",
      "Glow + holographic sheen",
      "Glow + ripple",
      "Glow + dark vignette",
      "Shadow + grain",
      "Shadow + gloss",
      "Shadow + blur",
      "Shadow + gradient",
      "Shadow + vignette",
      "Shadow + bevel",
      "Shadow + neon edge",
      "Shadow + metallic shine",
      "Shadow + paper grain",
      "Shadow + light rays",
      "Grain + gradient + blur",
      "Grain + glow + vignette",
      "Grain + shadow + gloss",
      "Grain + ripple + blur",
      "Grain + VHS jitter + scanlines",
      "Grain + chromatic shift + glow",
      "Grain + smoke + vignette",
      "Grain + metallic sheen + shadow",
      "Grain + lens flare + blur",
      "Grain + prism split + glow",
      "Vignette + blur + glow",
      "Vignette + grain + shadow",
      "Vignette + gradient + flare",
      "Vignette + ripple + grain",
      "Vignette + neon glow + scanlines",
      "Vignette + smoke + blur",
      "Vignette + metallic shine + shadow",
      "Vignette + RGB split + noise",
      "Vignette + sparkle + bloom",
      "Vignette + glass warp + light leak",
      "Glass blur + gradient + glow",
      "Frosted glass + shadow + noise",
      "Glass warp + chromatic shift + glow",
      "Refraction + gradient + vignette",
      "Prism split + blur + grain",
      "Ice shine + blur + glow",
      "Wet gloss + reflection + shadow",
      "Mirror reflection + gradient + flare",
      "Holographic sheen + glow + grain",
      "Pearl shimmer + soft shadow + vignette",
      "Motion blur + light streaks + glow",
      "Zoom blur + radial gradient + flare",
      "Tilt-shift blur + grain + vignette",
      "Radial blur + halo glow + noise",
      "Edge blur + dark vignette + shadow",
      "Bokeh blur + sparkle + gradient",
      "Haze blur + aurora gradient + glow",
      "Melt distortion + chromatic split + blur",
      "Wobble distortion + neon glow + grain",
      "Heat distortion + sunset gradient + haze",
      "VHS jitter + scanlines + RGB shift",
      "CRT scanlines + glow + vignette",
      "Pixelation + glow + chromatic aberration",
      "Mosaic tiles + metallic sheen + shadow",
      "Posterize + gradient + grain",
      "Solarize + glow + blur",
      "Invert + neon gradient + scanlines",
      "Threshold + shadow + grain",
      "Emboss + gloss + shadow",
      "Bevel + metallic shine + vignette",
      "Satin + inner glow + shadow",
      "Aurora gradient + haze blur + sparkle",
      "Smoke texture + glow + vignette",
      "Dust noise + light rays + blur",
      "Canvas grain + paint streak + shadow",
      "Paper grain + soft gradient + gloss",
      "Sand texture + heat haze + sun flare",
      "Frost texture + cyan glow + blur",
      "Neon gradient + bloom + chromatic shift",
      "Cinematic vignette + film grain + soft bloom",
    ],
  },
  {
    name: "Crazy Benchmark Ideas",
    items: [
      "Recursive cathedral mirrors",
      "Orbital onion rings in a thunder dome",
      "Molten checkerboard eclipse",
      "Bio-luminescent barcode storm",
      "Glitch waterfall over a prism canyon",
      "Hyperbolic jellyfish blueprint",
      "Laser lace tornado",
      "Exploded kaleidoscope skeleton",
      "Acid rain wireframe lagoon",
      "Crystal foam over black mercury",
      "Pixel confetti singularity",
      "Radar bloom inside a glass volcano",
      "Tectonic neon scar tissue",
      "Turbulence cathedral smoke organ",
      "Fractal domino aurora",
      "Broken hologram flower engine",
      "Contour-map heartbeat reactor",
      "Soft-body labyrinth spill",
      "Mirrored sunspot machine",
      "Feral moire gravity well",
      "Infrared coral signal burst",
      "Spiral staircase made of fog",
      "Spectrum bruise over chrome dunes",
      "Ghost grid with liquid shadows",
      "Magnetic ink cyclone",
      "Glass intestine tunnel",
      "Electric pollen over night ice",
      "Alien topography carousel",
      "Ceramic thunder petals",
      "Radioactive velvet ripples",
      "Wormhole sticker sheet",
      "Lava filament calligraphy",
      "Satellite bloom fracture field",
      "Mirror maze after lightning",
      "Acid pastel collision cloud",
      "Shattered moon scanline choir",
      "Toxic gradient waterfall",
      "Mechanical peacock distortion",
      "Iridescent seismic lashes",
      "Noisy halo centrifuge",
      "Volcanic stained-glass drift",
      "Vector fungus bloom",
      "Nebula barcode embroidery",
      "Oscilloscope blossom storm",
      "Liquid metal pollen halo",
      "Laser coral recursion",
      "Cinderblock rainbow collapse",
      "Mirage ribs over a dead ocean",
      "Hologram ash tornado",
      "Crown of broken refractions",
      "Chrome fog chessboard",
      "Tangled aurora nerves",
      "Prismatic dust avalanche",
      "Cat-eye vortex factory",
      "Gothic plasma fountain",
      "Burning silk interference map",
      "Fisheye relic shrine",
      "Glitch confessional window",
      "Cosmic oil slick anatomy",
      "Ribbon storm in a mirror swamp",
      "Stacked eclipse conveyor belt",
      "Synthetic moss over signal ruins",
      "Wavy terminal stained glass",
      "Moon jelly cathedral choir",
      "Parallax bruise reactor",
      "Shimmer blade monsoon",
      "Electrostatic dune harp",
      "Tidal scanner hallucination",
      "Polygon fever dream",
      "Sparks trapped in syrup",
      "Recursive sticker nebula",
      "Soft chrome meteor garden",
      "Aurora x-ray ribcage",
      "Radar petals in wet concrete",
      "Torus swarm under VHS rain",
      "Mirrored fungus engine",
      "Glass confetti avalanche",
      "Corrupted halo orchard",
      "Blown-out pastel void siren",
      "Serpentine bevel waterfall",
      "Translucent crater bouquet",
      "Cyberpunk bruise petals",
      "Noise cathedral with chrome lungs",
      "Glow worms in a prism skull",
      "Cartographic fire lace",
      "Melted neon braille storm",
      "Holographic cartilage bloom",
      "Liquid scanline origami",
      "Screaming gradient topography",
      "Frosted plasma aquarium",
      "Mirror bubble tectonics",
      "Sonic bloom shrapnel field",
      "Interference zebra eclipse",
      "Velvet glitch avalanche",
      "Gamma-ray ribbon orchard",
      "Synthetic tidepool circuitry",
      "Echo chamber of sparks",
      "Celestial barcode bruise",
      "Chromed smoke machinery",
      "Shattered candy radar",
      "Orbiting foam architecture",
      "Recursive obsidian confetti",
      "Torn satin lightning atlas",
      "Plasma quilt in freefall",
      "Depth-map hallucination bloom",
      "Kinetic pearl landslide",
      "Volumetric thorn crown",
      "Mosaic thunder membrane",
      "Gravity well sticker explosion",
      "Magnetized frost ribbons",
      "Digital reef collapse",
      "Wet hologram spine tunnel",
      "Solar flare bead curtain",
      "Broken prism orchard map",
      "Dissolving cathedral sonar",
      "Hyperglass smoke petals",
      "Orbit bruise conveyor",
      "Fungus starburst machine",
      "Prismatic rust waterfall",
      "Aurora static anatomy",
      "Tessellated impact bloom",
      "Negative-space fire nest",
      "Optical foam earthquake",
      "Liquid mercury mandala panic",
      "Burnt velvet signal choir",
      "Chromatic scar carousel",
      "Terminal pollen eclipse",
      "Electrified marbling collapse",
      "Ghost orbit scan chamber",
      "Hologram petri dish riot",
      "Smoked mirror wave battery",
      "Alien confetti weather front",
      "Gilded bruise pulse engine",
      "Razor bloom in soft fog",
      "Shimmer fungus escalator",
      "Recursive plasma handwriting",
      "Vortex chandelier fallout",
      "Oil slick thunder anatomy",
      "Cyan magma wind tunnel",
      "Signal-ridden moonflower",
      "Mirrored avalanche petals",
      "Glass reef with flare bones",
      "Chrome waterfall recursion",
      "Candy-colored fault lines",
      "Data storm over pearl smoke",
      "Toxic aurora braids",
      "Circular saw halo dream",
      "Photon ivy under black rain",
      "Glitch tide cathedral",
      "Polarized lava lace",
      "Exploded satin radar bloom",
      "Ionic barcode blossom",
      "Stereo fog centrifuge",
      "Melt choir over broken chrome",
      "Electric bruise wormhole",
      "Strobing topographic candy shell",
      "Vitreous pollen impact ring",
      "Aurora antlers in oil",
      "Spiral flare cemetery",
      "Shattered signal aquarium",
      "Prism bones under static heat",
      "Cathedral lungs of pixel dust",
      "Recursive flare fungus",
      "Chrome ripple debris field",
      "Ghost petals in a test chamber",
      "Haze reactor over candy basalt",
      "Neural lace heat mirage",
      "Blacklight cartilage topography",
      "Mirror-rain blossom collapse",
      "Plasma barcode opera",
      "Coral circuitry thunder bloom",
      "Acid velvet sonar halo",
      "Wet spectrum rib fracture",
      "Tidal glass bruise machine",
      "Infinite sticker eclipse",
      "Molten prism weather map",
      "Laser pollen burial mound",
      "X-ray aurora orchard",
      "Holographic dune seizure",
      "Signal fog chandelier",
      "Smashed pearl gravity choir",
      "Electro bloom in mirror tar",
      "Pixelated cathedral weather",
      "Concentric panic foam",
      "Radar lace over liquid asphalt",
      "Satin glitch monolith field",
      "Frost signal in a jewel swamp",
      "Mosaic bruise floodlight",
      "Interference orchard collapse",
      "Recursive mercury coral",
      "Aurora conveyor scar map",
      "Fractal thunder petals",
      "Solarized ghost reef",
      "Chromed barcode thunderhead",
      "Glowing cartilage fault dome",
      "Beveled wormhole pollen",
      "Static blossom over obsidian surf",
      "Refraction riot cathedral",
      "Liquid antenna eclipse",
      "VHS halo over broken marble",
    ],
  },
];

const palettes = [
  ["#07111f", "#123456", "#4fd1ff", "#9b5cff", "#ffe082"],
  ["#120914", "#3b174a", "#ff4f9a", "#8bffb7", "#ffd166"],
  ["#0b0d18", "#203354", "#6ee7ff", "#ff7a59", "#f7d154"],
  ["#0f1117", "#1f2937", "#67e8f9", "#a78bfa", "#fda4af"],
  ["#09131a", "#1d4d4f", "#5eead4", "#38bdf8", "#fef08a"],
  ["#140c0a", "#5b2a1f", "#ff8a65", "#ffcc80", "#ffe0b2"],
  ["#0a1016", "#243b53", "#7dd3fc", "#c084fc", "#f9a8d4"],
  ["#0f172a", "#1d3557", "#00d4ff", "#ff4d6d", "#ffd166"],
];

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll("+", " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hash(value) {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function pickPalette(index) {
  return palettes[index % palettes.length];
}

function makeNoise(seed, count, width, height, color, opacity) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const x = ((seed * (i + 11) * 13) % width).toFixed(1);
    const y = ((seed * (i + 17) * 29) % height).toFixed(1);
    const r = 0.5 + ((seed + i * 7) % 3);
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
  }
  return dots.join("");
}

function makeScanlines(height, color, opacity, gap = 14) {
  let lines = "";
  for (let y = 0; y < height; y += gap) {
    lines += `<rect x="0" y="${y}" width="1600" height="2" fill="${color}" opacity="${opacity}"/>`;
  }
  return lines;
}

function makeMosaic(seed, c1, c2, c3) {
  let out = "";
  const colors = [c1, c2, c3];
  for (let y = 0; y < 900; y += 100) {
    for (let x = 0; x < 1600; x += 100) {
      const color = colors[(seed + x + y) % colors.length];
      out += `<rect x="${x}" y="${y}" width="100" height="100" fill="${color}" opacity="0.12"/>`;
    }
  }
  return out;
}

function makeSparkles(seed, c1) {
  let out = "";
  for (let i = 0; i < 18; i++) {
    const x = 80 + ((seed * (i + 3) * 23) % 1440);
    const y = 70 + ((seed * (i + 5) * 31) % 760);
    const size = 6 + ((seed + i * 17) % 18);
    out += `<g opacity="0.75"><line x1="${x - size}" y1="${y}" x2="${x + size}" y2="${y}" stroke="${c1}" stroke-width="2"/><line x1="${x}" y1="${y - size}" x2="${x}" y2="${y + size}" stroke="${c1}" stroke-width="2"/></g>`;
  }
  return out;
}

function makeRings(seed, c1, c2, c3) {
  let out = "";
  const colors = [c1, c2, c3];
  for (let i = 0; i < 8; i++) {
    const r = 70 + i * 34;
    const color = colors[(seed + i) % colors.length];
    out += `<circle cx="800" cy="420" r="${r}" fill="none" stroke="${color}" stroke-width="${4 + (i % 3) * 2}" opacity="${0.12 + i * 0.03}"/>`;
  }
  return out;
}

function makeSpiral(_seed, c1) {
  const pts = [];
  for (let i = 0; i < 180; i++) {
    const angle = i * 0.28;
    const radius = 10 + i * 2.6;
    const x = 800 + Math.cos(angle) * radius;
    const y = 420 + Math.sin(angle) * radius * 0.7;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `<polyline points="${pts.join(" ")}" fill="none" stroke="${c1}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.26"/>`;
}

function makeZigZag(seed, c1, c2) {
  let d = "M 120 500";
  for (let i = 0; i < 18; i++) {
    const x = 120 + i * 80;
    const y = 240 + ((seed + i * 19) % 360);
    d += ` L ${x} ${y}`;
  }
  return `<path d="${d}" fill="none" stroke="${c1}" stroke-width="10" opacity="0.24"/><path d="${d}" fill="none" stroke="${c2}" stroke-width="4" opacity="0.32"/>`;
}

function makeOrbitDots(seed, c1, c2, c3) {
  let out = "";
  const colors = [c1, c2, c3];
  for (let i = 0; i < 32; i++) {
    const angle = (Math.PI * 2 * i) / 32;
    const rx = 380 + ((seed + i * 7) % 120);
    const ry = 180 + ((seed + i * 11) % 90);
    const x = 800 + Math.cos(angle) * rx;
    const y = 420 + Math.sin(angle) * ry;
    const color = colors[i % colors.length];
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${4 + (i % 4) * 2}" fill="${color}" opacity="0.72"/>`;
  }
  return out;
}

function buildSvg(label, index, _groupName) {
  const width = 1600;
  const height = 900;
  const seed = hash(`${index}-${label}`);
  const [bg, bg2, c1, c2, c3] = pickPalette(index);
  const lower = label.toLowerCase();

  const defs = [];
  const layers = [];

  defs.push(`
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="55%" stop-color="${bg2}"/>
      <stop offset="100%" stop-color="#02040a"/>
    </linearGradient>
    <radialGradient id="orbA" cx="30%" cy="35%" r="40%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orbB" cx="75%" cy="30%" r="34%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${c3}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
    </linearGradient>
    <filter id="blur20"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="blur48"><feGaussianBlur stdDeviation="48"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <filter id="ripple"><feTurbulence type="turbulence" baseFrequency="0.008 0.02" numOctaves="2" seed="${seed % 97}"/><feDisplacementMap in="SourceGraphic" scale="32"/></filter>
    <filter id="warp"><feTurbulence type="fractalNoise" baseFrequency="0.015 0.008" numOctaves="3" seed="${seed % 53}"/><feDisplacementMap in="SourceGraphic" scale="46"/></filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.4"/></filter>
    <filter id="emboss"><feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/><feSpecularLighting in="blur" surfaceScale="4" specularConstant="1.2" specularExponent="20" lighting-color="#ffffff" result="spec"><fePointLight x="400" y="-200" z="200"/></feSpecularLighting><feComposite in="spec" in2="SourceAlpha" operator="in"/></filter>
    <clipPath id="panelClip"><rect x="160" y="120" width="1280" height="660" rx="42"/></clipPath>
  `);

  layers.push(`<rect width="${width}" height="${height}" fill="url(#bg)"/>`);
  layers.push(`<rect width="${width}" height="${height}" fill="url(#orbA)" opacity="0.45"/>`);
  layers.push(`<rect width="${width}" height="${height}" fill="url(#orbB)" opacity="0.38"/>`);

  const panel = `
    <g filter="url(#shadow)">
      <rect x="160" y="120" width="1280" height="660" rx="42" fill="rgba(8,12,22,0.55)" stroke="rgba(255,255,255,0.12)" />
    </g>
  `;
  layers.push(panel);

  const baseShapes = `
    <g clip-path="url(#panelClip)">
      <circle cx="430" cy="360" r="180" fill="${c1}" opacity="0.34"/>
      <circle cx="1080" cy="310" r="150" fill="${c2}" opacity="0.28"/>
      <rect x="320" y="470" width="960" height="110" rx="55" fill="${c3}" opacity="0.14"/>
      <path d="M200 620 C460 500 680 760 920 600 S1300 540 1460 650 L1460 900 L200 900 Z" fill="${c2}" opacity="0.12"/>
    </g>
  `;

  let effectLayers = baseShapes;

  if (lower.includes("gradient") || lower.includes("aurora")) {
    effectLayers += `<path d="M80 290 C380 120 570 420 860 240 S1320 120 1520 280" fill="none" stroke="url(#sheen)" stroke-width="140" stroke-linecap="round" opacity="0.45" filter="url(#blur20)"/>`;
  }
  if (lower.includes("blur") || lower.includes("haze") || lower.includes("bokeh")) {
    effectLayers += `<g filter="url(#blur48)" opacity="0.42"><circle cx="520" cy="380" r="120" fill="${c1}"/><circle cx="1010" cy="300" r="90" fill="${c2}"/><rect x="420" y="520" width="640" height="120" rx="60" fill="${c3}"/></g>`;
  }
  if (lower.includes("glow") || lower.includes("bloom") || lower.includes("halo")) {
    effectLayers += `<circle cx="790" cy="370" r="220" fill="url(#orbA)" opacity="0.55" filter="url(#blur48)"/><circle cx="790" cy="370" r="112" fill="${c3}" opacity="0.18"/>`;
  }
  if (lower.includes("shadow")) {
    effectLayers += `<ellipse cx="790" cy="650" rx="430" ry="90" fill="#000000" opacity="0.32" filter="url(#blur20)"/>`;
  }
  if (
    lower.includes("grain") ||
    lower.includes("noise") ||
    lower.includes("dust") ||
    lower.includes("paper") ||
    lower.includes("canvas") ||
    lower.includes("sand") ||
    lower.includes("frost") ||
    lower.includes("smoke")
  ) {
    effectLayers += `<rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.08"/>`;
    effectLayers += makeNoise(seed, 130, width, height, "#ffffff", 0.08);
  }
  if (
    lower.includes("vignette") ||
    lower.includes("cinematic") ||
    lower.includes("spotlight") ||
    lower.includes("tunnel")
  ) {
    effectLayers += `<rect width="${width}" height="${height}" fill="none" stroke="#000000" stroke-width="220" opacity="0.28"/>`;
  }
  if (lower.includes("ripple") || lower.includes("wave")) {
    effectLayers = `<g filter="url(#ripple)">${effectLayers}</g>`;
  }
  if (
    lower.includes("glass") ||
    lower.includes("refraction") ||
    lower.includes("fisheye") ||
    lower.includes("wobble") ||
    lower.includes("melt") ||
    lower.includes("mirage")
  ) {
    effectLayers = `<g filter="url(#warp)">${effectLayers}</g>`;
    effectLayers += `<rect x="250" y="180" width="1100" height="520" rx="34" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)"/>`;
  }
  if (lower.includes("pixel") || lower.includes("mosaic")) {
    effectLayers += makeMosaic(seed, c1, c2, c3);
  }
  if (lower.includes("crt") || lower.includes("scanlines") || lower.includes("vhs")) {
    effectLayers += makeScanlines(height, "#8fd3ff", 0.1);
  }
  if (lower.includes("rgb") || lower.includes("chromatic") || lower.includes("prism")) {
    effectLayers += `<circle cx="760" cy="360" r="170" fill="none" stroke="#ff4d6d" stroke-width="12" opacity="0.22"/><circle cx="790" cy="360" r="170" fill="none" stroke="#00d4ff" stroke-width="12" opacity="0.22"/><circle cx="775" cy="360" r="170" fill="none" stroke="#ffe082" stroke-width="12" opacity="0.18"/>`;
  }
  if (
    lower.includes("metallic") ||
    lower.includes("sheen") ||
    lower.includes("gloss") ||
    lower.includes("wet") ||
    lower.includes("mirror") ||
    lower.includes("pearl") ||
    lower.includes("holographic") ||
    lower.includes("shine")
  ) {
    effectLayers += `<rect x="220" y="200" width="1160" height="80" rx="40" fill="url(#sheen)" opacity="0.45" filter="url(#blur20)"/>`;
  }
  if (
    lower.includes("light") ||
    lower.includes("rays") ||
    lower.includes("flare") ||
    lower.includes("spark") ||
    lower.includes("sparkle") ||
    lower.includes("sunburst")
  ) {
    effectLayers += `<g opacity="0.4"><path d="M790 140 L790 760" stroke="${c3}" stroke-width="4"/><path d="M420 370 L1160 370" stroke="${c1}" stroke-width="4"/><path d="M520 170 L1060 570" stroke="${c2}" stroke-width="3"/><path d="M520 570 L1060 170" stroke="${c3}" stroke-width="3"/></g>`;
    effectLayers += makeSparkles(seed, c3);
  }
  if (lower.includes("emboss") || lower.includes("bevel") || lower.includes("satin")) {
    effectLayers += `<text x="800" y="420" text-anchor="middle" font-size="132" fill="rgba(255,255,255,0.18)" filter="url(#emboss)" font-family="Helvetica, Arial, sans-serif" font-weight="700">FX</text>`;
  }
  if (lower.includes("invert")) {
    effectLayers += `<rect width="${width}" height="${height}" fill="#ffffff" opacity="0.08"/>`;
  }
  if (lower.includes("threshold") || lower.includes("posterize") || lower.includes("solarize")) {
    effectLayers += `<g opacity="0.22"><rect x="250" y="230" width="220" height="220" fill="${c1}"/><rect x="470" y="230" width="220" height="220" fill="${c2}"/><rect x="690" y="230" width="220" height="220" fill="${c3}"/><rect x="910" y="230" width="220" height="220" fill="#ffffff"/></g>`;
  }
  if (lower.includes("recursive") || lower.includes("infinite")) {
    for (let i = 0; i < 8; i++) {
      const inset = 110 + i * 48;
      effectLayers += `<rect x="${inset}" y="${90 + i * 28}" width="${1600 - inset * 2}" height="${900 - (90 + i * 28) * 2}" rx="${30 - i}" fill="none" stroke="${[c1, c2, c3][i % 3]}" stroke-width="${6 - (i % 3)}" opacity="0.16"/>`;
    }
  }
  if (lower.includes("orbital") || lower.includes("orbit") || lower.includes("concentric")) {
    effectLayers += makeRings(seed, c1, c2, c3);
    effectLayers += makeOrbitDots(seed, c1, c2, c3);
  }
  if (
    lower.includes("spiral") ||
    lower.includes("vortex") ||
    lower.includes("wormhole") ||
    lower.includes("centrifuge")
  ) {
    effectLayers += makeSpiral(seed, c3);
  }
  if (
    lower.includes("thunder") ||
    lower.includes("lightning") ||
    lower.includes("fault") ||
    lower.includes("fracture") ||
    lower.includes("scar")
  ) {
    effectLayers += makeZigZag(seed, c1, c3);
  }
  if (
    lower.includes("barcode") ||
    lower.includes("scan") ||
    lower.includes("signal") ||
    lower.includes("terminal") ||
    lower.includes("data")
  ) {
    for (let i = 0; i < 40; i++) {
      const x = 220 + i * 28;
      const h = 120 + ((seed + i * 31) % 360);
      effectLayers += `<rect x="${x}" y="${180 + (i % 6) * 10}" width="${10 + (i % 3) * 6}" height="${h}" fill="${i % 2 ? c1 : c2}" opacity="0.11"/>`;
    }
  }
  if (
    lower.includes("cathedral") ||
    lower.includes("choir") ||
    lower.includes("opera") ||
    lower.includes("shrine")
  ) {
    for (let i = 0; i < 7; i++) {
      const x = 240 + i * 150;
      const y = 260 + ((i + seed) % 3) * 18;
      effectLayers += `<path d="M ${x} 700 L ${x} ${y} Q ${x + 40} ${y - 90} ${x + 80} ${y} L ${x + 80} 700 Z" fill="none" stroke="${i % 2 ? c2 : c3}" stroke-width="5" opacity="0.18"/>`;
    }
  }
  if (
    lower.includes("petal") ||
    lower.includes("flower") ||
    lower.includes("blossom") ||
    lower.includes("orchard") ||
    lower.includes("coral")
  ) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const x = 800 + Math.cos(angle) * 180;
      const y = 420 + Math.sin(angle) * 120;
      effectLayers += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="90" ry="34" transform="rotate(${((angle * 180) / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 2 ? c1 : c2}" opacity="0.16"/>`;
    }
  }
  if (
    lower.includes("mosaic") ||
    lower.includes("tessellated") ||
    lower.includes("checkerboard") ||
    lower.includes("quilt")
  ) {
    effectLayers += makeMosaic(seed + 7, c1, c2, c3);
  }
  if (
    lower.includes("confetti") ||
    lower.includes("debris") ||
    lower.includes("shrapnel") ||
    lower.includes("avalanche") ||
    lower.includes("explosion")
  ) {
    for (let i = 0; i < 120; i++) {
      const x = (seed * (i + 13) * 17) % 1600;
      const y = (seed * (i + 19) * 23) % 900;
      const w = 8 + ((seed + i * 3) % 34);
      const h = 6 + ((seed + i * 5) % 20);
      const rot = (seed + i * 29) % 180;
      const color = [c1, c2, c3][i % 3];
      effectLayers += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.28" transform="rotate(${rot} ${x} ${y})"/>`;
    }
  }
  if (
    lower.includes("marbling") ||
    lower.includes("oil") ||
    lower.includes("mercury") ||
    lower.includes("syrup") ||
    lower.includes("liquid")
  ) {
    effectLayers += `<path d="M120 260 C320 120 520 380 760 230 S1120 120 1450 300" fill="none" stroke="${c2}" stroke-width="56" stroke-linecap="round" opacity="0.18" filter="url(#blur20)"/>`;
    effectLayers += `<path d="M160 580 C340 430 590 700 860 520 S1200 390 1460 590" fill="none" stroke="${c1}" stroke-width="70" stroke-linecap="round" opacity="0.16" filter="url(#blur20)"/>`;
  }
  if (lower.includes("sticker") || lower.includes("bubble") || lower.includes("bead")) {
    for (let i = 0; i < 24; i++) {
      const x = 220 + ((seed + i * 47) % 1120);
      const y = 160 + ((seed + i * 29) % 520);
      const r = 18 + ((seed + i * 13) % 42);
      const color = [c1, c2, c3][(i + 1) % 3];
      effectLayers += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="0.18" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>`;
    }
  }
  if (
    lower.includes("topography") ||
    lower.includes("contour") ||
    lower.includes("cartographic") ||
    lower.includes("map")
  ) {
    for (let i = 0; i < 10; i++) {
      effectLayers += `<ellipse cx="800" cy="430" rx="${180 + i * 70}" ry="${90 + i * 32}" fill="none" stroke="${[c1, c2, c3][i % 3]}" stroke-width="3" opacity="0.12"/>`;
    }
  }
  if (
    lower.includes("weather") ||
    lower.includes("storm") ||
    lower.includes("monsoon") ||
    lower.includes("rain")
  ) {
    for (let i = 0; i < 90; i++) {
      const x = (seed * (i + 7) * 37) % 1600;
      const y = (seed * (i + 9) * 13) % 900;
      effectLayers += `<line x1="${x}" y1="${y}" x2="${x - 26}" y2="${y + 60}" stroke="${c3}" stroke-width="2" opacity="0.18"/>`;
    }
  }

  layers.push(effectLayers);

  layers.push(`
    <g>
      <text x="220" y="750" fill="#f8fbff" font-family="Helvetica, Arial, sans-serif" font-size="48" font-weight="700">${String(index).padStart(3, "0")}. ${escapeXml(label)}</text>
      <text x="220" y="800" fill="rgba(248,251,255,0.64)" font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="3">SVG EFFECT EXAMPLE</text>
    </g>
  `);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${defs.join("")}
  </defs>
  ${layers.join("\n  ")}
</svg>
`;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const manifest = [];
let globalIndex = 1;

fs.rmSync(effectsDir, { recursive: true, force: true });
fs.mkdirSync(effectsDir, { recursive: true });

for (const group of groups) {
  for (const idea of group.items) {
    const slug = `${String(globalIndex).padStart(3, "0")}-${slugify(idea)}`;
    const fileName = `${slug}.svg`;
    const output = buildSvg(idea, globalIndex, group.name);
    fs.writeFileSync(path.join(effectsDir, fileName), output, "utf8");
    manifest.push({
      index: globalIndex,
      group: group.name,
      title: idea,
      file: `effects/${fileName}`,
    });
    globalIndex += 1;
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Effect SVG Examples</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      background: #07111f;
      color: #eef6ff;
      font-family: Helvetica, Arial, sans-serif;
    }
    h1 { margin: 0 0 8px; font-size: 36px; }
    p { margin: 0 0 28px; color: rgba(238,246,255,0.72); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 18px;
    }
    .card {
      display: block;
      background: rgba(13, 19, 31, 0.92);
      border: 1px solid rgba(120, 170, 220, 0.18);
      border-radius: 18px;
      overflow: hidden;
      color: inherit;
      text-decoration: none;
    }
    .card img {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      background: #02040a;
    }
    .meta {
      padding: 14px 16px 18px;
    }
    .num {
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #7dd3fc;
      margin-bottom: 8px;
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .group {
      font-size: 13px;
      color: rgba(238,246,255,0.64);
    }
  </style>
</head>
<body>
  <h1>400 SVG Effect Examples</h1>
  <p>Single-effect, multi-effect, and benchmark concept boards stored in <code>examples/effects</code>.</p>
  <div class="grid">
    ${manifest
      .map(
        item => `<a class="card" href="./${item.file}">
      <img src="./${item.file}" alt="${escapeXml(item.title)}" loading="lazy" />
      <div class="meta">
        <div class="num">${String(item.index).padStart(3, "0")}</div>
        <div class="title">${escapeXml(item.title)}</div>
        <div class="group">${escapeXml(item.group)}</div>
      </div>
    </a>`
      )
      .join("\n    ")}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(examplesDir, "index.html"), html, "utf8");
fs.writeFileSync(
  path.join(examplesDir, "effects-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log(`Generated ${manifest.length} SVG examples in ${path.relative(root, effectsDir)}`);
