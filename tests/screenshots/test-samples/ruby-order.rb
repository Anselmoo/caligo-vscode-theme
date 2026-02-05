# DECLARATION (teal): method definition

def process_order(items, discount)
  # MUTATION (orange): clamp discount
  applied = [[discount, 0.0].max, 0.5].min

  # DECLARATION (teal): accumulator
  total = 0.0

  # CONTROL FLOW (purple): loop
  items.each do |item|
    total += item.fetch(:price, 0.0) # USAGE (blue) + DATA literal (green)
  end

  tag = applied > 0.25 ? "loyalty" : "standard" # CONTROL FLOW

  # CONTROL FLOW (purple): return
  { total: total * (1 - applied), tag: tag }
end

# USAGE (blue): invocation preview
sample = [
  { name: "caligo", price: 42.0 },
  { name: "eclipse", price: 17.5 }
]

puts process_order(sample, 0.2)
