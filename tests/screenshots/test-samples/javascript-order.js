// DECLARATION (teal): function signature
function processOrder(items, discount) {
  // MUTATION (orange): clamp discount between 0 and 0.5
  const applied = Math.min(Math.max(discount, 0), 0.5);

  // DECLARATION (teal): accumulator
  let total = 0;

  // CONTROL FLOW (purple): loop and conditional
  for (const item of items) {
    const price = item.price ?? 0; // USAGE (blue) + DATA literal (green)
    total += price; // MUTATION (orange)
  }

  const tag = applied > 0.25 ? "loyalty" : "standard"; // CONTROL FLOW (purple)

  // CONTROL FLOW (purple): return with USAGE (blue)
  return { total: total * (1 - applied), tag };
}

// USAGE (blue): invocation preview
const result = processOrder(
  [
    { name: "caligo", price: 42 },
    { name: "eclipse", price: 17.5 },
  ],
  0.2
);

console.log(result);
