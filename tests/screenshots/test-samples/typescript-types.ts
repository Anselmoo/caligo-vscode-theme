// DECLARATION (teal): data model + function signature
type Item = { name: string; price: number; tag?: string };
// TODO: add JSDoc comments
export function processOrder(items: Item[], discount: number): { total: number; tag: string } {
  // MUTATION: clamp discount into 0–0.5 (range)
  const applied = Math.min(Math.max(discount, 0), 0.5);

  // DECLARATION (teal): accumulator
  let total = 0;

  // CONTROL FLOW: loop and conditional
  for (const item of items) {
    const price = item.price ?? 0; // USAGE + DATA
    total += price; // MUTATION (orange)
  }

  // FIXEME: adjust tag based on discount
  const tag = applied > 0.25 ? "loyalty" : "standard"; // CONTROL FLOW

  // CONTROL FLOW: return with USAGE
  return { total: total * (1 - applied), tag };
}

// USAGE: invocation preview
processOrder(
  [
    { name: "caligo", price: 42 },
    { name: "eclipse", price: 17.5 },
  ],
  0.2
);
