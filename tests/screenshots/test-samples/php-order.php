<?php
// DECLARATION (teal): function definition
function process_order(array $items, float $discount): array {
    // MUTATION (orange): clamp discount
    $applied = max(0.0, min($discount, 0.5));

    // DECLARATION (teal): accumulator
    $total = 0.0;

    // CONTROL FLOW (purple): loop
    foreach ($items as $item) {
        $price = $item['price'] ?? 0.0; // USAGE (blue) + DATA literal (green)
        $total += $price; // MUTATION (orange)
    }

    $tag = $applied > 0.25 ? 'loyalty' : 'standard'; // CONTROL FLOW

    // CONTROL FLOW (purple): return
    return ['total' => $total * (1 - $applied), 'tag' => $tag];
}

// USAGE (blue): invocation preview
$result = process_order([
    ['name' => 'caligo', 'price' => 42.0],
    ['name' => 'eclipse', 'price' => 17.5],
], 0.2);

print_r($result);
