-- Lua Sample - Tables, Metatables, Coroutines, Colon Calls

-- Module definition
local M = {}

-- Table constructor
local person = {
    name = "Alice",
    age = 30,
    greet = function(self)
        return "Hello, " .. self.name
    end
}

-- Colon method call (passes self implicitly)
print(person:greet())

-- Metatable example
local Vector = {}
Vector.__index = Vector

function Vector:new(x, y)
    local instance = { x = x, y = y }
    setmetatable(instance, self)
    return instance
end

function Vector:magnitude()
    return math.sqrt(self.x * self.x + self.y * self.y)
end

-- Metamethod for addition
function Vector.__add(a, b)
    return Vector:new(a.x + b.x, a.y + b.y)
end

-- Create vectors
local v1 = Vector:new(3, 4)
local v2 = Vector:new(1, 2)
local v3 = v1 + v2  -- Uses __add metamethod

print("Magnitude:", v1:magnitude())
print("Sum:", v3.x, v3.y)

-- Local variables
local function calculate(x, y)
    local sum = x + y
    local product = x * y
    return sum, product  -- Multiple return values
end

local s, p = calculate(5, 3)
print("Sum:", s, "Product:", p)

-- Vararg function
local function sum(...)
    local args = {...}
    local total = 0
    for _, v in ipairs(args) do
        total = total + v
    end
    return total
end

print("Sum of 1,2,3,4:", sum(1, 2, 3, 4))

-- Coroutines
local function producer()
    for i = 1, 5 do
        print("Producing:", i)
        coroutine.yield(i)
    end
end

local co = coroutine.create(producer)
while coroutine.status(co) ~= "dead" do
    local success, value = coroutine.resume(co)
    if value then
        print("Consumed:", value)
    end
end

-- Iterators with pairs/ipairs
local colors = {"red", "green", "blue"}
for i, color in ipairs(colors) do
    print(i, color)
end

local config = {host = "localhost", port = 8080}
for key, value in pairs(config) do
    print(key .. ":", value)
end

-- String patterns
local text = "The price is $42.50"
local price = text:match("%$(%d+%.%d+)")
print("Extracted price:", price)

-- Table indexing
local array = {10, 20, 30}
print("First element:", array[1])  -- Lua is 1-indexed

local dict = {name = "Bob", age = 25}
print("Name:", dict.name, "or", dict["name"])

-- Length operator
print("Array length:", #array)
print("String length:", #"hello")

-- Concatenation
local greeting = "Hello" .. " " .. "World"
print(greeting)

-- Global environment
_G.globalVar = "I am global"
print(_G.globalVar)

-- Goto and labels (Lua 5.2+)
local function gotoExample()
    local x = 10
    if x > 5 then
        goto skip
    end
    print("This is skipped")
    ::skip::
    print("After goto")
end

gotoExample()

-- Require for module loading
-- local utils = require("utils")

-- Module export
M.Vector = Vector
M.sum = sum

return M
