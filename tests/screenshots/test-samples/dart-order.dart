// DECLARATION (teal): data + function
class Item {
  final String name;
  final double price;
  const Item(this.name, this.price);
}

Map<String, Object> processOrder(List<Item> items, double discount) {
  // MUTATION (orange): clamp discount
  final applied = discount.clamp(0.0, 0.5) as double;

  // DECLARATION (teal): accumulator
  double total = 0.0;

  // CONTROL FLOW (purple): loop
  for (final item in items) {
    total += item.price; // USAGE (blue) + DATA literal (green)
  }

  final tag = applied > 0.25 ? 'loyalty' : 'standard'; // CONTROL FLOW

  // CONTROL FLOW (purple): return
  return {'total': total * (1 - applied), 'tag': tag};
}

void main() {
  // USAGE (blue): invocation preview
  final items = [const Item('caligo', 42.0), const Item('eclipse', 17.5)];
  final result = processOrder(items, 0.2);
  print(result);
}
