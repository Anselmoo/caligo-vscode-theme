-- DECLARATION (teal): data + function
data Item = Item { name :: String, price :: Double }
  deriving (Show)

processOrder :: [Item] -> Double -> (Double, String)
processOrder items discount =
  let -- MUTATION (orange): clamp discount
      applied = max 0.0 (min discount 0.5)
      -- DECLARATION (teal): accumulator
      total = foldr ((+) . price) 0.0 items -- USAGE (blue) + DATA literal (green)
      -- CONTROL FLOW (purple)
      tag = if applied > 0.25 then "loyalty" else "standard"
   in (total * (1 - applied), tag) -- CONTROL FLOW (purple): return

-- USAGE (blue): invocation preview
main :: IO ()
main = do
  let sample = [Item "caligo" 42.0, Item "eclipse" 17.5]
  let (total, tag) = processOrder sample 0.2
  putStrLn $ "total=" ++ show total ++ " tag=" ++ tag
