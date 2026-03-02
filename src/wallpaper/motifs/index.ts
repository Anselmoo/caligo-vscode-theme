/**
 * Motifs index — maps seedId to its motif function.
 */
import type { MotifFn } from "../types.js";
import { auroraNoir } from "./aurora-noir.js";
import { cinder } from "./cinder.js";
import { deepSable } from "./deep-sable.js";
import { eclipse } from "./eclipse.js";
import { graphiteFlux } from "./graphite-flux.js";
import { mandarian } from "./mandarian.js";
import { midnightAtelier } from "./midnight-atelier.js";
import { nebulaNight } from "./nebula-night.js";
import { obsidianGlow } from "./obsidian-glow.js";
import { voidEmber } from "./void-ember.js";

export const MOTIFS: Record<string, MotifFn> = {
  AuroraNoir: auroraNoir,
  Cinder: cinder,
  DeepSable: deepSable,
  Eclipse: eclipse,
  GraphiteFlux: graphiteFlux,
  Mandarian: mandarian,
  MidnightAtelier: midnightAtelier,
  NebulaNight: nebulaNight,
  ObsidianGlow: obsidianGlow,
  VoidEmber: voidEmber,
};

export {
  auroraNoir,
  cinder,
  deepSable,
  eclipse,
  graphiteFlux,
  mandarian,
  midnightAtelier,
  nebulaNight,
  obsidianGlow,
  voidEmber,
};
