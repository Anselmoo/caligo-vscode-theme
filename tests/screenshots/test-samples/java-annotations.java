// DECLARATION (teal): data + method signature
import java.util.List;
import java.util.Map;

public final class OrderProcessor {

    public static Map<String, Object> processOrder(List<Map<String, Object>> items, double discount) {
        // MUTATION (orange): clamp discount
        double applied = Math.min(Math.max(discount, 0.0), 0.5);

        // DECLARATION (teal): accumulator
        double total = 0.0;

        // CONTROL FLOW (purple): loop
        for (Map<String, Object> item : items) {
            // USAGE (blue) + DATA literal (green)
            Object raw = item.getOrDefault("price", 0.0);
            if (raw instanceof Number value) {
                total += value.doubleValue(); // MUTATION (orange)
            }
        }

        String tag = applied > 0.25 ? "loyalty" : "standard"; // CONTROL FLOW

        // CONTROL FLOW (purple): return with USAGE (blue)
        return Map.of("total", total * (1 - applied), "tag", tag);
    }

    // USAGE (blue): invocation preview
    public static void main(String[] args) {
        var items = List.of(
            Map.of("name", "caligo", "price", 42.0),
            Map.of("name", "eclipse", "price", 17.5)
        );

        var result = processOrder(items, 0.2);
        System.out.println(result);
    }
}
