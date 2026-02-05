// DECLARATION (teal): data model and function
#[derive(Debug, Clone)]
struct Item {
    name: String,
    price: f32,
}

fn process_order(items: &[Item], discount: f32) -> (f32, &'static str) {
    // MUTATION (orange): clamp discount
    let mut applied = discount.clamp(0.0, 0.5);

    // DECLARATION (teal): accumulator
    let mut total = 0.0_f32;

    // CONTROL FLOW (purple): loop and conditional
    for item in items {
        total += item.price; // USAGE (blue) + DATA literal (green)
    }

    let tag = if applied > 0.25 { "loyalty" } else { "standard" }; // CONTROL FLOW

    // CONTROL FLOW (purple): return
    (total * (1.0 - applied), tag)
}

fn main() {
    // USAGE (blue): invocation preview
    let sample = vec![
        Item { name: "caligo".into(), price: 42.0 },
        Item { name: "eclipse".into(), price: 17.5 },
    ];

    let (total, tag) = process_order(&sample, 0.2);
    println!("total={:.2}, tag={}", total, tag);
}
