// DECLARATION (teal): data + function signature
package main

import "fmt"

type Item struct {
	Name  string
	Price float64
}

// processOrder highlights intent layers for the theme preview.
func processOrder(items []Item, discount float64) (float64, string) {
	// MUTATION (orange): clamp discount
	applied := discount
	if applied < 0 {
		applied = 0
	}
	if applied > 0.5 {
		applied = 0.5
	}

	// DECLARATION (teal): accumulator
	total := 0.0

	// CONTROL FLOW (purple): loop
	for _, item := range items {
		total += item.Price // USAGE (blue) + DATA literal (green)
	}

	tag := "standard"
	if applied > 0.25 {
		tag = "loyalty" // MUTATION + CONTROL FLOW
	}

	// CONTROL FLOW (purple): return
	return total * (1-applied), tag
}

func main() {
	// USAGE (blue): invocation preview
	items := []Item{{Name: "caligo", Price: 42.0}, {Name: "eclipse", Price: 17.5}}
	total, tag := processOrder(items, 0.2)
	fmt.Printf("total=%.2f tag=%s\n", total, tag)
}
