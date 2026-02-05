# DECLARATION (teal): module + function
defmodule OrderProcessor do
  # process_order highlights intent layers for the theme preview
  def process_order(items, discount) when is_list(items) do
    # MUTATION (orange): clamp discount
    applied =
      discount
      |> max(0.0)
      |> min(0.5)

    # DECLARATION (teal): accumulator
    {total, _} =
      Enum.map_reduce(items, 0.0, fn item, acc ->
        price = Map.get(item, :price, 0.0) # USAGE (blue) + DATA literal (green)
        {price, acc + price}
      end)

    tag = if applied > 0.25, do: "loyalty", else: "standard" # CONTROL FLOW

    # CONTROL FLOW (purple): return
    %{total: total * (1 - applied), tag: tag}
  end
end

# USAGE (blue): invocation preview
sample = [%{name: "caligo", price: 42.0}, %{name: "eclipse", price: 17.5}]
IO.inspect(OrderProcessor.process_order(sample, 0.2))
