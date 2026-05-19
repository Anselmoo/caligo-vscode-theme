/**
 * Motifs index — maps seedId to its motif function.
 */
import type { MotifFn } from "../types.js";

import { attractor } from "./attractor.js";
import { cipher } from "./cipher.js";
import { convolution } from "./convolution.js";
import { datamosh } from "./datamosh.js";
import { driftField } from "./drift-field.js";
import { erosion } from "./erosion.js";
import { filament } from "./filament.js";
import { fracture } from "./fracture.js";
import { interference } from "./interference.js";
import { kaleidoscope } from "./kaleidoscope.js";
import { lattice } from "./lattice.js";
import { orbital } from "./orbital.js";
import { parallax } from "./parallax.js";
import { penrose } from "./penrose.js";
import { ripple } from "./ripple.js";
import { scatter } from "./scatter.js";
import { signal } from "./signal.js";
import { stratum } from "./stratum.js";
import { tessellate } from "./tessellate.js";
import { topology } from "./topology.js";

export const MOTIFS: Record<string, MotifFn> = {
  Attractor: attractor,
  Cipher: cipher,
  Convolution: convolution,
  Datamosh: datamosh,
  DriftField: driftField,
  Erosion: erosion,
  Filament: filament,
  Fracture: fracture,
  Interference: interference,
  Kaleidoscope: kaleidoscope,
  Lattice: lattice,
  Orbital: orbital,
  Parallax: parallax,
  Penrose: penrose,
  Ripple: ripple,
  Scatter: scatter,
  Signal: signal,
  Stratum: stratum,
  Tessellate: tessellate,
  Topology: topology,
};

export {
  attractor,
  cipher,
  convolution,
  datamosh,
  driftField,
  erosion,
  filament,
  fracture,
  interference,
  kaleidoscope,
  lattice,
  orbital,
  parallax,
  penrose,
  ripple,
  scatter,
  signal,
  stratum,
  tessellate,
  topology,
};
