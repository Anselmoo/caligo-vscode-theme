// DECLARATION (teal): record + method
using System;
using System.Collections.Generic;

public record Item(string Name, double Price);

public static class OrderProcessor
{
    public static (double total, string tag) ProcessOrder(IEnumerable<Item> items, double discount)
    {
        // MUTATION (orange): clamp discount
        var applied = Math.Min(Math.Max(discount, 0.0), 0.5);

        // DECLARATION (teal): accumulator
        double total = 0.0;

        // CONTROL FLOW (purple): loop
        foreach (var item in items)
        {
            total += item.Price; // USAGE (blue) + DATA literal (green)
        }

        var tag = applied > 0.25 ? "loyalty" : "standard"; // CONTROL FLOW

        // CONTROL FLOW (purple): return
        return (total * (1 - applied), tag);
    }

    public static void Main()
    {
        // USAGE (blue): invocation preview
        var items = new List<Item> { new("caligo", 42.0), new("eclipse", 17.5) };
        var result = ProcessOrder(items, 0.2);
        Console.WriteLine($"total={result.total:F2} tag={result.tag}");
    }
}
