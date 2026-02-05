// DECLARATION (teal): struct + function
const std = @import("std");

const Item = struct {
    name: []const u8,
    price: f64,
};

fn processOrder(items: []const Item, discount: f64) !struct { total: f64, tag: []const u8 } {
    // MUTATION (orange): clamp discount
    var applied = if (discount < 0) 0 else discount;
    if (applied > 0.5) applied = 0.5;

    // DECLARATION (teal): accumulator
    var total: f64 = 0;

    // CONTROL FLOW (purple): loop
    for (items) |item| {
        total += item.price; // USAGE (blue) + DATA literal (green)
    }

    const tag = if (applied > 0.25) "loyalty" else "standard"; // CONTROL FLOW

    // CONTROL FLOW (purple): return
    return .{ .total = total * (1 - applied), .tag = tag };
}

pub fn main() !void {
    var items = [_]Item{ .{ .name = "caligo", .price = 42.0 }, .{ .name = "eclipse", .price = 17.5 } };
    const result = try processOrder(&items, 0.2);
    std.debug.print("total={d:.2} tag={s}\n", .{ result.total, result.tag });
}
