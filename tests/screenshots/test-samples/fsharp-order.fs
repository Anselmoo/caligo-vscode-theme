// DECLARATION (teal): record + function
type Item = { Name: string; Price: float }

let processOrder (items: Item list) (discount: float) : float * string =
    // MUTATION (orange): clamp discount
    let applied = discount |> max 0.0 |> min 0.5

    // DECLARATION (teal): accumulator
    let total = items |> List.sumBy (fun item -> item.Price) // USAGE (blue) + DATA literal (green)

    let tag = if applied > 0.25 then "loyalty" else "standard" // CONTROL FLOW

    // CONTROL FLOW (purple): return
    total * (1.0 - applied), tag

// USAGE (blue): invocation preview
[ { Name = "caligo"; Price = 42.0 }; { Name = "eclipse"; Price = 17.5 } ]
|> fun items -> processOrder items 0.2
|> printfn "total=%f tag=%s"
