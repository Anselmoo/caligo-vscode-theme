-- DECLARATION (teal): function definition
local function clamp(value, min_value, max_value)
  if value < min_value then return min_value end
  if value > max_value then return max_value end
  return value
end

local function process_order(items, discount)
  -- MUTATION (orange): clamp discount
  local applied = clamp(discount, 0.0, 0.5)

  -- DECLARATION (teal): accumulator
  local total = 0.0

  -- CONTROL FLOW (purple): loop
  for _, item in ipairs(items) do
    local price = item.price or 0.0 -- USAGE (blue) + DATA literal (green)
    total = total + price           -- MUTATION (orange)
  end

  local tag = applied > 0.25 and "loyalty" or "standard" -- CONTROL FLOW

  -- CONTROL FLOW (purple): return
  return { total = total * (1 - applied), tag = tag }
end

-- USAGE (blue): invocation preview
local sample = {
  { name = "caligo", price = 42.0 },
  { name = "eclipse", price = 17.5 },
}

local result = process_order(sample, 0.2)
for k, v in pairs(result) do
  print(k .. "=" .. tostring(v))
end
