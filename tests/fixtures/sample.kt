// Kotlin Sample - Coroutines, Delegation, Extension Functions

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

// Data class with delegation
data class User(val name: String, val age: Int)

// Lazy delegation
class Configuration {
    val apiKey: String by lazy {
        System.getenv("API_KEY") ?: "default-key"
    }
}

// Extension function
fun String.toTitleCase(): String =
    split(" ").joinToString(" ") { 
        it.replaceFirstChar { c -> c.uppercase() } 
    }

// Suspend function with Flow
suspend fun fetchUsers(): Flow<User> = flow {
    val users = listOf(
        User("Alice", 30),
        User("Bob", 25)
    )
    users.forEach { emit(it) }
}

// Coroutine builder
fun main() = runBlocking {
    launch {
        fetchUsers().collect { user ->
            println("${user.name} is ${user.age}")
        }
    }
}

// Sealed class for type-safe state
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

// When expression with pattern matching
fun <T> handleResult(result: Result<T>) = when (result) {
    is Result.Success -> println("Data: ${result.data}")
    is Result.Error -> println("Error: ${result.message}")
    Result.Loading -> println("Loading...")
}

// Companion object
class Logger {
    companion object {
        fun log(message: String) = println("[LOG] $message")
    }
}

// Inline reified function
inline fun <reified T> jsonParse(json: String): T? {
    return null // Simplified
}

// Nullable types and safe calls
fun processName(name: String?): String =
    name?.trim()?.toTitleCase() ?: "Unknown"

// Operator overloading
data class Vector(val x: Int, val y: Int) {
    operator fun plus(other: Vector) = Vector(x + other.x, y + other.y)
}
