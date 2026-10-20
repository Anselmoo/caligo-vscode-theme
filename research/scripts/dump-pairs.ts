// Dump CONTRAST_PAIRS to JSON. Usage: CONTRAST_PAIRS_LIB=/abs/src/lib/contrast-pairs.ts npx tsx research/scripts/dump-pairs.ts > pairs.json
const lib = await import(process.env.CONTRAST_PAIRS_LIB ?? "../../src/lib/contrast-pairs.ts");
console.log(
  JSON.stringify({
    pairs: lib.CONTRAST_PAIRS,
    exempt: Object.keys(lib.CONTRAST_EXEMPT_FOREGROUNDS),
  })
);
