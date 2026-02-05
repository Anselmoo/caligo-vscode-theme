# DECLARATION (teal): function and typing
from typing import Dict, List


def process_order(items: List[Dict[str, float]], discount: float) -> Dict[str, float]:
    """Annotate intent layers for the theme preview."""

    # MUTATION (orange): clamp discount into range
    applied = min(max(discount, 0.0), 0.5)

    # DECLARATION (teal): accumulator
    total = 0.0

    # CONTROL FLOW (purple): loop and conditional
    for item in items:
        price = item.get("price", 0.0)  # USAGE (blue) + DATA (green literal)
        total += price                   # MUTATION (orange)

    tag = "loyalty" if applied > 0.25 else "standard"  # CONTROL FLOW (purple)

    # CONTROL FLOW (purple): return with USAGE (blue)
    return {"total": total * (1 - applied), "tag": tag}


# USAGE (blue): invocation preview
example = process_order(
    [
        {"name": "caligo", "price": 42.0},
        {"name": "eclipse", "price": 17.5},
    ],
    0.2,
)

print(example)
