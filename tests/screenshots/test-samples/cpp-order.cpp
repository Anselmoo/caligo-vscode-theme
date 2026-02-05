// DECLARATION (teal): struct + function signature
#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

struct Item {
    std::string name;
    double price;
};

std::pair<double, std::string> processOrder(const std::vector<Item>& items, double discount) {
    // MUTATION (orange): clamp discount
    double applied = std::clamp(discount, 0.0, 0.5);

    // DECLARATION (teal): accumulator
    double total = 0.0;

    // CONTROL FLOW (purple): loop
    for (const auto& item : items) {
        total += item.price; // USAGE (blue) + DATA literal (green)
    }

    std::string tag = applied > 0.25 ? "loyalty" : "standard"; // CONTROL FLOW

    // CONTROL FLOW (purple): return
    return {total * (1 - applied), tag};
}

int main() {
    // USAGE (blue): invocation preview
    std::vector<Item> items{{"caligo", 42.0}, {"eclipse", 17.5}};
    auto [total, tag] = processOrder(items, 0.2);
    std::cout << "total=" << total << " tag=" << tag << '\n';
}
