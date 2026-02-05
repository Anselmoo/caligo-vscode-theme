// Go Sample - Goroutines, Channels, Defer, Error Handling

package main

import (
	"fmt"
	"sync"
	"time"
)

// Struct with tags
type User struct {
	Name  string `json:"name" db:"user_name"`
	Email string `json:"email" db:"email"`
	Age   int    `json:"age"`
}

// Interface
type Writer interface {
	Write(data []byte) (int, error)
}

// Method with receiver
func (u *User) Greet() string {
	return fmt.Sprintf("Hello, %s!", u.Name)
}

// Error handling pattern
func fetchUser(id int) (*User, error) {
	if id < 0 {
		return nil, fmt.Errorf("invalid user ID: %d", id)
	}
	return &User{Name: "Alice", Age: 30}, nil
}

// Goroutines and channels
func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	
	for job := range jobs {
		fmt.Printf("Worker %d processing job %d\n", id, job)
		time.Sleep(time.Millisecond * 100)
		results <- job * 2
	}
}

func main() {
	// Channel creation
	jobs := make(chan int, 10)
	results := make(chan int, 10)
	
	// WaitGroup for synchronization
	var wg sync.WaitGroup
	
	// Launch goroutines
	for w := 1; w <= 3; w++ {
		wg.Add(1)
		go worker(w, jobs, results, &wg)
	}
	
	// Send jobs
	for j := 1; j <= 5; j++ {
		jobs <- j
	}
	close(jobs)
	
	// Wait and close results
	go func() {
		wg.Wait()
		close(results)
	}()
	
	// Collect results
	for result := range results {
		fmt.Printf("Result: %d\n", result)
	}
	
	// Defer example
	defer fmt.Println("Cleanup completed")
	
	// Error handling
	user, err := fetchUser(1)
	if err != nil {
		panic(err)
	}
	fmt.Println(user.Greet())
}

// Select statement for channel multiplexing
func selectExample() {
	ch1 := make(chan string)
	ch2 := make(chan string)
	
	go func() {
		time.Sleep(1 * time.Second)
		ch1 <- "from ch1"
	}()
	
	select {
	case msg := <-ch1:
		fmt.Println(msg)
	case msg := <-ch2:
		fmt.Println(msg)
	case <-time.After(2 * time.Second):
		fmt.Println("timeout")
	}
}

// Type assertion and type switch
func typeSwitch(i interface{}) {
	switch v := i.(type) {
	case int:
		fmt.Printf("Integer: %d\n", v)
	case string:
		fmt.Printf("String: %s\n", v)
	default:
		fmt.Printf("Unknown type\n")
	}
}

// Variadic function
func sum(nums ...int) int {
	total := 0
	for _, num := range nums {
		total += num
	}
	return total
}
