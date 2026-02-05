// Java Example - Annotation & Generic Focus
import java.util.List;
import java.util.ArrayList;

@Service  // Annotation → META layer
public class UserService {
    private final Database db;  // Final → readonly
    
    @Inject  // Dependency injection annotation
    public UserService(Database db) {
        this.db = db;
    }
    
    @Override  // Override annotation → DOCUMENTATION
    public String toString() {
        return "UserService{db=" + db + "}";
    }
    
    // Generics → DECLARATION layer
    public <T extends Comparable<T>> List<T> sortItems(List<T> items) {
        var result = new ArrayList<>(items);  // var → type inference
        result.sort(Comparable::compareTo);   // Method reference → CONTROL FLOW
        return result;
    }
    
    // Lambda expression → CONTROL FLOW
    public void processUsers(List<User> users) {
        users.forEach(user -> {
            if (user.isActive()) {
                user.save();  // Mutation
            }
        });
    }
    
    // Synchronized → CONTROL FLOW
    public synchronized void incrementCounter() {
        counter++;  // Mutation under lock
    }
    
    // Try-catch → CONTROL FLOW
    public void riskyOperation() throws IOException {
        try {
            db.connect();
        } catch (SQLException e) {
            throw new IOException("Connection failed", e);
        } finally {
            db.close();
        }
    }
    
    // Static access → USAGE with static modifier
    public static final int MAX_USERS = Integer.MAX_VALUE;
}

// Record (Java 14+) → DECLARATION
record Point(int x, int y) {}

// Sealed class (Java 17+) → META
sealed class Shape permits Circle, Rectangle {}
