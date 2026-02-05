// DECLARATION (teal): struct + function
import Foundation

struct Item {
    let name: String
    let price: Double
}

func processOrder(_ items: [Item], discount: Double) -> (total: Double, tag: String) {
    // MUTATION (orange): clamp discount
    let applied = min(max(discount, 0.0), 0.5)

    // DECLARATION (teal): accumulator
    var total: Double = 0

    // CONTROL FLOW (purple): loop
    for item in items {
        total += item.price // USAGE (blue) + DATA literal (green)
    }

    let tag = applied > 0.25 ? "loyalty" : "standard" // CONTROL FLOW

    // CONTROL FLOW (purple): return
    return (total * (1 - applied), tag)
}

// USAGE (blue): invocation preview
let items = [Item(name: "caligo", price: 42.0), Item(name: "eclipse", price: 17.5)]
let result = processOrder(items, discount: 0.2)
print("total=\(String(format: "%.2f", result.total)) tag=\(result.tag)")
