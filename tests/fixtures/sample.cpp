// C++ Sample - Templates, RAII, Move Semantics, Concepts

#include <iostream>
#include <memory>
#include <vector>
#include <string>
#include <algorithm>

// Template class with type parameter
template<typename T>
class Container {
private:
    std::unique_ptr<T[]> data;
    size_t size;
    
public:
    // Constructor with move semantics
    Container(size_t n) : data(std::make_unique<T[]>(n)), size(n) {}
    
    // Deleted copy constructor (RAII)
    Container(const Container&) = delete;
    Container& operator=(const Container&) = delete;
    
    // Defaulted move constructor
    Container(Container&&) = default;
    Container& operator=(Container&&) = default;
    
    // Virtual destructor
    virtual ~Container() = default;
    
    // Const member function
    size_t getSize() const noexcept {
        return size;
    }
    
    // Operator overloading
    T& operator[](size_t index) {
        return data[index];
    }
};

// Concept definition (C++20)
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

// Function with concept constraint
template<Numeric T>
T add(T a, T b) requires std::is_arithmetic_v<T> {
    return a + b;
}

// Constexpr function
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// Consteval function (C++20)
consteval int square(int n) {
    return n * n;
}

// Virtual base class
class Shape {
public:
    virtual void draw() const = 0;  // Pure virtual
    virtual ~Shape() = default;
};

class Circle final : public Shape {
private:
    double radius;
    
public:
    explicit Circle(double r) : radius(r) {}
    
    void draw() const override final {
        std::cout << "Drawing circle" << std::endl;
    }
};

// Lambda expressions
void lambdaExample() {
    int x = 10;
    
    // Lambda with capture
    auto increment = [&x]() { x++; };
    increment();
    
    // Lambda with explicit return type
    auto multiply = [](int a, int b) -> int {
        return a * b;
    };
    
    std::vector<int> nums = {1, 2, 3, 4, 5};
    
    // Lambda in algorithm
    std::for_each(nums.begin(), nums.end(), [](int& n) {
        n *= 2;
    });
}

// Smart pointers
void smartPointerExample() {
    // Unique pointer
    auto ptr1 = std::make_unique<int>(42);
    
    // Shared pointer
    auto ptr2 = std::make_shared<std::string>("Hello");
    
    // Move semantics
    auto ptr3 = std::move(ptr1);  // ptr1 is now null
    
    // Weak pointer
    std::weak_ptr<std::string> weak = ptr2;
}

// Structured bindings (C++17)
std::pair<int, std::string> getUser() {
    return {1, "Alice"};
}

void structuredBindingExample() {
    auto [id, name] = getUser();
    std::cout << "ID: " << id << ", Name: " << name << std::endl;
}

// Template specialization
template<typename T>
class Storage {
    T value;
};

template<>
class Storage<bool> {
    unsigned char value;
};

// Variadic templates
template<typename... Args>
void print(Args... args) {
    (std::cout << ... << args) << std::endl;
}

// SFINAE with enable_if
template<typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type
increment(T value) {
    return value + 1;
}

// Attributes
[[nodiscard]] int calculate() {
    return 42;
}

[[maybe_unused]] void unused() {}

[[deprecated("Use newFunction instead")]]
void oldFunction() {}

// Inline namespace
inline namespace v2 {
    void apiFunction() {}
}

// Friend function
class Friendship {
private:
    int secret = 42;
    friend void revealSecret(const Friendship& f);
};

void revealSecret(const Friendship& f) {
    std::cout << "Secret: " << f.secret << std::endl;
}

// Try-catch exception handling
void exceptionExample() {
    try {
        throw std::runtime_error("Something went wrong");
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }
}

// Namespace
namespace utils {
    void helper() {
        std::cout << "Helper function" << std::endl;
    }
}

// Using declaration
using utils::helper;

// Auto type deduction
void autoExample() {
    auto x = 42;
    auto s = std::string("hello");
    auto lambda = [](int x) { return x * 2; };
}

// Alignas and alignof
struct alignas(16) AlignedData {
    int x;
    int y;
};

// Main function
int main() {
    constexpr int fact5 = factorial(5);
    std::cout << "5! = " << fact5 << std::endl;
    
    lambdaExample();
    smartPointerExample();
    structuredBindingExample();
    
    return 0;
}
