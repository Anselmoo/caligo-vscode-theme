# Python Example - Declaration Focus
from dataclasses import dataclass
from typing import List

@dataclass
class User:
    """User data model with intent-based coloring."""
    name: str
    email: str
    active: bool = True
    
    async def save_to_database(self, db: Database) -> None:
        """Save user to database with async/await."""
        # Mutation: state changes
        self.active = True
        await db.save(self)
        
    @property
    def display_name(self) -> str:
        """Property decorator → META layer."""
        return f"{self.name} <{self.email}>"

async def fetch_users(limit: int = 10) -> List[User]:
    """Async function → CONTROL FLOW + async modifier."""
    users = []
    
    # List comprehension → DATA layer
    active_users = [u for u in users if u.active]
    
    # Control flow: if statement
    if len(active_users) > limit:
        return active_users[:limit]
    
    return active_users

# Global scope modifier → MUTATION
global user_cache
user_cache = {}
