"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { type Task, getTasks, setTasks } from "@/lib/mock-db"

interface CreateTaskDialogProps {
  onTaskCreated?: () => void
}

export function CreateTaskDialog({ onTaskCreated }: CreateTaskDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<Task["category"]>("learning")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !content.trim()) return

    const newTask: Task = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.name,
      content: content.trim(),
      category,
      completed: false,
      isShared: false,
      createdAt: new Date().toISOString(),
      likes: [],
    }

    const tasks = getTasks()
    setTasks([newTask, ...tasks])

    setContent("")
    setCategory("learning")
    setOpen(false)
    onTaskCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add Morning Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>오늘의 아침 과업 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              카테고리
            </label>
            <Select value={category} onValueChange={(value) => setCategory(value as Task["category"])}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">수능</SelectItem>
                <SelectItem value="meditation">내신</SelectItem>
                <SelectItem value="reading">비교과(독서)</SelectItem>
                <SelectItem value="academy">학원/과외</SelectItem>
                <SelectItem value="workout">운동</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">
              무엇을 할 계획인가요?
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="오늘의 목표를 입력하세요..."
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={!content.trim()}>
              추가
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
