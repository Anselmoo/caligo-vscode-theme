// DECLARATION (teal): case class + function
final case class Item(name: String, price: Double)

object OrderProcessor {
  def processOrder(items: List[Item], discount: Double): (Double, String) = {
    // MUTATION (orange): clamp discount
    val applied = discount.max(0.0).min(0.5)

    // DECLARATION (teal): accumulator
    val total = items.map(_.price).sum // USAGE (blue) + DATA literal (green)

    val tag = if applied > 0.25 then "loyalty" else "standard" // CONTROL FLOW

    // CONTROL FLOW (purple): return
    (total * (1 - applied), tag)
  }

  // USAGE (blue): invocation preview
  def main(args: Array[String]): Unit = {
    val items = List(Item("caligo", 42.0), Item("eclipse", 17.5))
    val (total, tag) = processOrder(items, 0.2)
    println(s"total=$total tag=$tag")
  }
}
