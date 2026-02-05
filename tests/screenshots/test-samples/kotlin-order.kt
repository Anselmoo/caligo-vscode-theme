// DECLARATION (teal): data class + function

data class Item(val name: String, val price: Double)

fun processOrder(items: List<Item>, discount: Double): Pair<Double, String> {
    // MUTATION (orange): clamp discount
    val applied = discount.coerceIn(0.0, 0.5)

    // DECLARATION (teal): accumulator
    var total = 0.0

    // CONTROL FLOW (purple): loop
    for (item in items) {
        total += item.price // USAGE (blue) + DATA literal (green)
    }

    val tag = if (applied > 0.25) "loyalty" else "standard" // CONTROL FLOW

    // CONTROL FLOW (purple): return
    return total * (1 - applied) to tag
}

fun main() {
    // USAGE (blue): invocation preview
    val items = listOf(Item("caligo", 42.0), Item("eclipse", 17.5))
    val (total, tag) = processOrder(items, 0.2)
    println("total=${'$'}{"""%.2f""".format(total)} tag=${'$'}tag")
}
