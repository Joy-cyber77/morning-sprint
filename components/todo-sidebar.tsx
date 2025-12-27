"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { type Todo, getTodos, setTodos } from "@/lib/mock-db"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ListTodo } from "lucide-react"

export function TodoSidebar() {
  const { user } = useAuth()
  const [todos, setTodosState] = useState<Todo[]>([])
  const [newTodoContent, setNewTodoContent] = useState("")

  const loadTodos = () => {
    if (!user) return
    const allTodos = getTodos()
    const userTodos = allTodos.filter((todo) => todo.userId === user.id)
    setTodosState(userTodos)
  }

  useEffect(() => {
    loadTodos()
  }, [user])

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !newTodoContent.trim()) return

    const newTodo: Todo = {
      id: Date.now().toString(),
      userId: user.id,
      content: newTodoContent.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }

    const allTodos = getTodos()
    setTodos([...allTodos, newTodo])
    setNewTodoContent("")
    loadTodos()
  }

  const handleToggleTodo = (todoId: string) => {
    const allTodos = getTodos()
    const todoIndex = allTodos.findIndex((t) => t.id === todoId)

    if (todoIndex !== -1) {
      allTodos[todoIndex].completed = !allTodos[todoIndex].completed
      setTodos(allTodos)
      loadTodos()
    }
  }

  const handleDeleteTodo = (todoId: string) => {
    const allTodos = getTodos()
    const filteredTodos = allTodos.filter((t) => t.id !== todoId)
    setTodos(filteredTodos)
    loadTodos()
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg" variant="outline" className="gap-2 fixed bottom-6 right-6 shadow-lg z-40 bg-transparent">
          <ListTodo className="w-5 h-5" />
          <span>
            Todos ({completedCount}/{totalCount})
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your Daily Todos</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {totalCount}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
              />
            </div>
          </Card>

          <form onSubmit={handleAddTodo} className="flex gap-2">
            <Input
              value={newTodoContent}
              onChange={(e) => setNewTodoContent(e.target.value)}
              placeholder="Add a new todo..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newTodoContent.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No todos yet. Add one to get started!
              </div>
            ) : (
              todos.map((todo) => (
                <Card key={todo.id} className="p-3 flex items-center gap-3 group hover:bg-card/80">
                  <Checkbox checked={todo.completed} onCheckedChange={() => handleToggleTodo(todo.id)} />
                  <span className={`flex-1 text-sm ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                    {todo.content}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
