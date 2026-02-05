// C# Sample - Async/Await, LINQ, Properties, Attributes, Pattern Matching

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SampleApp
{
    // Record type (C# 9)
    public record Person(string Name, int Age);

    // Class with properties and events
    public class User
    {
        // Auto-implemented property
        public string Name { get; set; }
        
        // Init-only property (C# 9)
        public int Id { get; init; }
        
        // Property with backing field
        private int _age;
        public int Age
        {
            get => _age;
            set => _age = value >= 0 ? value : throw new ArgumentException();
        }
        
        // Event declaration
        public event EventHandler<string> MessageReceived;
        
        protected virtual void OnMessageReceived(string message)
        {
            MessageReceived?.Invoke(this, message);
        }
    }

    // Attribute declaration
    [AttributeUsage(AttributeTargets.Method)]
    public class LogAttribute : Attribute
    {
        public string Message { get; set; }
    }

    // Interface with default implementation
    public interface IRepository<T>
    {
        Task<T> GetByIdAsync(int id);
        
        // Default interface method (C# 8)
        Task<IEnumerable<T>> GetAllAsync() => Task.FromResult(Enumerable.Empty<T>());
    }

    // Sealed class with async methods
    public sealed class UserRepository : IRepository<User>
    {
        private readonly List<User> _users = new();

        [Log(Message = "Fetching user")]
        public async Task<User> GetByIdAsync(int id)
        {
            await Task.Delay(100);  // Simulate async operation
            return _users.FirstOrDefault(u => u.Id == id);
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            await Task.Delay(50);
            return _users.AsEnumerable();
        }
    }

    // Extension method
    public static class StringExtensions
    {
        public static string ToTitleCase(this string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;
                
            return string.Join(" ", input.Split(' ')
                .Select(w => char.ToUpper(w[0]) + w[1..].ToLower()));
        }
    }

    // Pattern matching and switch expressions
    public class PaymentProcessor
    {
        // Switch expression (C# 8)
        public decimal CalculateFee(object payment) => payment switch
        {
            CreditCardPayment { Amount: > 1000 } => 50m,
            CreditCardPayment cc => cc.Amount * 0.03m,
            CashPayment { Amount: var amt } when amt > 500 => 10m,
            CashPayment => 0m,
            _ => throw new NotSupportedException()
        };

        // Pattern matching with is
        public void ProcessPayment(object payment)
        {
            if (payment is CreditCardPayment { CardNumber: var number } cc)
            {
                Console.WriteLine($"Processing credit card: {number}");
            }
            else if (payment is not null)
            {
                Console.WriteLine("Unknown payment type");
            }
        }
    }

    public record CreditCardPayment(string CardNumber, decimal Amount);
    public record CashPayment(decimal Amount);

    // LINQ queries
    public class DataProcessor
    {
        public IEnumerable<string> GetActiveUserNames(List<User> users)
        {
            // Query syntax
            var query = from user in users
                        where user.Age >= 18
                        orderby user.Name
                        select user.Name;

            // Method syntax
            var names = users
                .Where(u => u.Age >= 18)
                .OrderBy(u => u.Name)
                .Select(u => u.Name);

            return query;
        }
    }

    // Nullable reference types
    public class NullableExample
    {
        public string? OptionalName { get; set; }

        public string GetNameOrDefault()
        {
            // Null-coalescing operator
            return OptionalName ?? "Unknown";
        }

        public int? GetLength()
        {
            // Null-conditional operator
            return OptionalName?.Length;
        }
    }

    // Record with with-expression
    public class RecordExample
    {
        public void UpdatePerson()
        {
            var person = new Person("Alice", 30);
            var olderPerson = person with { Age = 31 };
            Console.WriteLine(olderPerson);
        }
    }

    // Lambda expressions and delegates
    public class LambdaExample
    {
        public delegate int BinaryOperation(int a, int b);

        public void Demonstratelambda()
        {
            BinaryOperation add = (a, b) => a + b;
            Func<int, int> square = x => x * x;
            Action<string> print = msg => Console.WriteLine(msg);

            var result = add(5, 3);
            print($"Result: {result}");
        }
    }

    // Using statement and declaration
    public class ResourceManagement
    {
        public void TraditionalUsing()
        {
            using (var stream = System.IO.File.OpenRead("file.txt"))
            {
                // Use stream
            } // stream.Dispose() called here
        }

        public void UsingDeclaration()
        {
            using var stream = System.IO.File.OpenRead("file.txt");
            // Use stream
            // stream.Dispose() called at end of scope
        }
    }

    // Yield return for iterators
    public class IteratorExample
    {
        public IEnumerable<int> GetEvenNumbers(int max)
        {
            for (int i = 0; i <= max; i += 2)
            {
                yield return i;
            }
        }
    }

    // Tuple and deconstruction
    public class TupleExample
    {
        public (int Id, string Name) GetUser()
        {
            return (1, "Alice");
        }

        public void UseUser()
        {
            var (id, name) = GetUser();
            Console.WriteLine($"ID: {id}, Name: {name}");
        }
    }

    // Indexer
    public class DataCollection
    {
        private Dictionary<string, int> _data = new();

        public int this[string key]
        {
            get => _data.TryGetValue(key, out var value) ? value : 0;
            set => _data[key] = value;
        }
    }

    // Operator overloading
    public struct Vector
    {
        public double X { get; set; }
        public double Y { get; set; }

        public static Vector operator +(Vector a, Vector b) =>
            new Vector { X = a.X + b.X, Y = a.Y + b.Y };
    }

    // Main program
    class Program
    {
        static async Task Main(string[] args)
        {
            var repo = new UserRepository();
            var user = await repo.GetByIdAsync(1);
            
            Console.WriteLine($"User: {user?.Name ?? "Not found"}");
            
            // Range and index operators (C# 8)
            int[] numbers = { 1, 2, 3, 4, 5 };
            var lastTwo = numbers[^2..];
            Console.WriteLine($"Last two: {string.Join(", ", lastTwo)}");
        }
    }
}
