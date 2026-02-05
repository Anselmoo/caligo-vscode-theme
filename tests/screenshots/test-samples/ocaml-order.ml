(* DECLARATION (teal): record + function *)
type item = { name : string; price : float }

let process_order (items : item list) (discount : float) : float * string =
  (* MUTATION (orange): clamp discount *)
  let applied = max 0.0 (min discount 0.5) in
  (* DECLARATION (teal): accumulator *)
  let total = List.fold_left (fun acc item -> acc +. item.price) 0.0 items in
  (* CONTROL FLOW (purple) *)
  let tag = if applied > 0.25 then "loyalty" else "standard" in
  (* CONTROL FLOW (purple): return *)
  (total *. (1.0 -. applied), tag)

(* USAGE (blue): invocation preview *)
let () =
  let items = [ { name = "caligo"; price = 42.0 }; { name = "eclipse"; price = 17.5 } ] in
  let total, tag = process_order items 0.2 in
  Printf.printf "total=%.2f tag=%s\n" total tag
