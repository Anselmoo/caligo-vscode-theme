// Rust Sample - Ownership, Borrowing, Async, Macros, Pattern Matching

use std::collections::HashMap;
use tokio::time::{sleep, Duration};

// Derive macros
#[derive(Debug, Clone)]
struct User {
    name: String,
    age: u32,
}

// Trait definition
trait Greet {
    fn greet(&self) -> String;
}

// Trait implementation
impl Greet for User {
    fn greet(&self) -> String {
        format!("Hello, {}!", self.name)
    }
}

// Async function with await
async fn fetch_data() -> Result<String, Box<dyn std::error::Error>> {
    sleep(Duration::from_millis(100)).await;
    Ok("data".to_string())
}

// Pattern matching with match
fn process_option(opt: Option<i32>) -> i32 {
    match opt {
        Some(value) if value > 0 => value * 2,
        Some(value) => value,
        None => 0,
    }
}

// If-let pattern matching
fn if_let_example(opt: Option<&str>) {
    if let Some(value) = opt {
        println!("Value: {}", value);
    }
}

// Borrowing and mutability
fn borrow_example() {
    let mut vec = vec![1, 2, 3];
    
    // Immutable borrow
    let first = &vec[0];
    println!("First: {}", first);
    
    // Mutable borrow
    vec.push(4);
    
    // Move semantics
    let moved_vec = vec;
    println!("{:?}", moved_vec);
}

// Lifetimes
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// Generic function with trait bounds
fn print_debug<T: std::fmt::Debug>(item: T) {
    println!("{:?}", item);
}

// Where clause
fn complex_bounds<T, U>(t: T, u: U)
where
    T: std::fmt::Display + Clone,
    U: std::fmt::Debug,
{
    println!("T: {}, U: {:?}", t, u);
}

// Unsafe block
unsafe fn raw_pointer_example() {
    let mut num = 42;
    let r1 = &num as *const i32;
    let r2 = &mut num as *mut i32;
    
    println!("r1: {}", *r1);
}

// Associated types in traits
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
}

// Macro usage
fn macro_example() {
    let v = vec![1, 2, 3];
    println!("Vector: {:?}", v);
    
    let mut map = HashMap::new();
    map.insert("key", "value");
}

// Const and static
const MAX_POINTS: u32 = 100_000;
static GLOBAL_COUNT: std::sync::atomic::AtomicUsize = 
    std::sync::atomic::AtomicUsize::new(0);

// Result and ? operator
fn try_operation() -> Result<i32, String> {
    let file = std::fs::read_to_string("file.txt")
        .map_err(|e| e.to_string())?;
    Ok(file.len() as i32)
}

// Destructuring
fn destructure_example() {
    let (x, y) = (10, 20);
    let User { name, age } = User {
        name: "Alice".to_string(),
        age: 30,
    };
    println!("x={}, y={}, name={}, age={}", x, y, name, age);
}

// Range expressions
fn range_example() {
    for i in 0..10 {
        println!("{}", i);
    }
    
    let slice = &[1, 2, 3, 4, 5][1..4];
    println!("{:?}", slice);
}

// Attributes and cfg
#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}

// Main function
#[tokio::main]
async fn main() {
    let data = fetch_data().await.unwrap();
    println!("Fetched: {}", data);
}
