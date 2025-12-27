"use client"

import type { Task } from "@/lib/mock-db"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Heart, Trash2, CheckCircle2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/components/auth-provider"
import { getTasks, setTasks } from "@/lib/mock-db"
import { useState } from "react"

const categoryColors = {
  learning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  meditation: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  reading: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  academy: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  workout: "bg-red-500/10 text-red-500 border-red-500/20",
  other: "bg-accent/10 text-accent-foreground border-accent/20",
}

const categoryLabels = {
  learning: "수능",
  meditation: "내신",
  reading: "비교과(독서)",
  academy: "학원/과외",
  workout: "운동",
  other: "기타",
}

interface TaskCardProps {
  task: Task
  onUpdate?: () => void
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { user } = useAuth()
  const [isLiked, setIsLiked] = useState(task.likes.includes(user?.id || ""))
  const [likesCount, setLikesCount] = useState(task.likes.length)

  const handleToggleComplete = () => {
    const tasks = getTasks()
    const taskIndex = tasks.findIndex((t) => t.id === task.id)

    if (taskIndex !== -1) {
      const updatedTask = { ...tasks[taskIndex] }
      updatedTask.completed = !updatedTask.completed
      updatedTask.completedAt = updatedTask.completed ? new Date().toISOString() : undefined

      tasks[taskIndex] = updatedTask
      setTasks(tasks)
      onUpdate?.()
    }
  }

  const handleLike = () => {
    if (!user) return

    const tasks = getTasks()
    const taskIndex = tasks.findIndex((t) => t.id === task.id)

    if (taskIndex !== -1) {
      const updatedTask = { ...tasks[taskIndex] }

      if (updatedTask.likes.includes(user.id)) {
        updatedTask.likes = updatedTask.likes.filter((id) => id !== user.id)
        setIsLiked(false)
        setLikesCount((prev) => prev - 1)
      } else {
        updatedTask.likes.push(user.id)
        setIsLiked(true)
        setLikesCount((prev) => prev + 1)
      }

      tasks[taskIndex] = updatedTask
      setTasks(tasks)
      onUpdate?.()
    }
  }

  const handleDelete = () => {
    if (!user) return

    const tasks = getTasks()
    const filteredTasks = tasks.filter((t) => t.id !== task.id)
    setTasks(filteredTasks)
    onUpdate?.()
  }

  const canDelete = user?.id === task.userId || user?.isAdmin

  return (
    <Card className={`p-4 space-y-3 hover:bg-card/80 transition-all ${task.completed ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <Checkbox checked={task.completed} onCheckedChange={handleToggleComplete} className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{task.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
            {task.completed && task.completedAt && (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>완료됨</span>
              </div>
            )}
          </div>
          <p className={`text-sm leading-relaxed ${task.completed ? "line-through text-muted-foreground" : ""}`}>
            {task.content}
          </p>
          <div
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${categoryColors[task.category]}`}
          >
            {categoryLabels[task.category]}
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border ml-9">
        <Button variant="ghost" size="sm" className={`gap-2 ${isLiked ? "text-red-500" : ""}`} onClick={handleLike}>
          <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
          <span className="text-xs">{likesCount}</span>
        </Button>
      </div>
    </Card>
  )
}
