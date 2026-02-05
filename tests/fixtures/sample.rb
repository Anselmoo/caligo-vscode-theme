# Ruby Example - Block & Symbol Focus
class UserService
  attr_accessor :users  # META layer - metaprogramming
  
  def initialize
    @users = []  # Instance variable
    @@count = 0  # Class variable
  end
  
  # Method with block parameter
  def process_users(&block)
    @users.each do |user|  # Block parameters
      yield user if block_given?
    end
  end
  
  # Proc and lambda
  def filter_active
    filter = lambda { |u| u.active? }
    @users.select(&filter)
  end
  
  # Symbol usage → DATA layer
  def sort_by_name
    @users.sort_by(&:name)
  end
  
  # String interpolation
  def welcome_message(name)
    "Hello #{name}, welcome!"
  end
  
  # Pattern matching (Ruby 3.0+)
  def categorize(user)
    case user
    in { admin: true }
      :admin
    in { active: true }
      :active_user
    else
      :guest
    end
  end
  
  # Module composition → META
  include Enumerable
  extend Forwardable
  
  # Super keyword → CONTROL FLOW
  def save
    super
    persist_to_cache
  end
end
