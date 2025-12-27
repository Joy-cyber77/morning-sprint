"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Share2, Pencil, X, Check, CalendarDays, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatKoreanDate, isLateMorningTodoCreatedAt } from "@/lib/utils"
import type { MorningTask, MorningTaskCategory } from "@/lib/morning/types"
import { apiCreateTask, apiDeleteTask, apiListTodayTasks, apiShareTodayTasks, apiUpdateTask } from "@/lib/morning/api"

const joyQuotes = [
  "Reset and ready with Joy. Tomorrow is another chance to shine.", // Sunday (0)
  "Start your week fresh with Joy. Let's set the tone for success!", // Monday (1)
  "Keep the flow going with Joy. One step at a time, you're doing fine.", // Tuesday (2)
  "Halfway there with Joy. Keep pushing, you are unstoppable.", // Wednesday (3)
  "Press on through Thursday with Joy. Don't stop now, you're almost there.", // Thursday (4)
  "Finish the week strong with Joy. You earned this feeling of pride.", // Friday (5)
  "Sparkle this Saturday with Joy. Dream big and learn something new.", // Saturday (6)
]

export default function TodosPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [tasks, setTasksState] = useState<MorningTask[]>([])
  const [newTaskContent, setNewTaskContent] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState<MorningTaskCategory>("learning")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const today = new Date()
  const todayQuote = joyQuotes[today.getDay()] ?? joyQuotes[0]

  const getTodayRangeIso = () => {
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const loadTasks = async () => {
    if (!user) return
    const range = getTodayRangeIso()
    const data = await apiListTodayTasks(range)
    setTasksState(data)
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      void loadTasks()
    }
  }, [user, loading, router])

  const addTask = async () => {
    if (!user || !newTaskContent.trim()) return

    await apiCreateTask({ content: newTaskContent.trim(), category: newTaskCategory, userName: user.name })
    setNewTaskContent("")
    await loadTasks()

    toast({ title: "작업 추가됨", description: "새로운 작업이 목록에 추가되었습니다." })
  }

  const startEditTask = (task: MorningTask) => {
    setEditingTaskId(task.id)
    setNewTaskContent(task.content)
    setNewTaskCategory(task.category)
  }

  const cancelEdit = () => {
    setEditingTaskId(null)
    setNewTaskContent("")
    setNewTaskCategory("learning")
  }

  const updateTask = async () => {
    if (!user || !editingTaskId || !newTaskContent.trim()) return

    await apiUpdateTask(editingTaskId, { content: newTaskContent.trim(), category: newTaskCategory })
    setEditingTaskId(null)
    setNewTaskContent("")
    await loadTasks()

    toast({ title: "작업 수정됨", description: "작업 내용이 업데이트되었습니다." })
  }

  const toggleTask = async (taskId: string) => {
    const current = tasks.find((t) => t.id === taskId)
    if (!current) return
    await apiUpdateTask(taskId, { completed: !current.completed })
    await loadTasks()
  }

  const deleteTask = async (taskId: string) => {
    await apiDeleteTask(taskId)
    await loadTasks()
    toast({ title: "작업 삭제됨", description: "작업이 삭제되었습니다." })
  }

  const shareAllTasks = async () => {
    if (!user) return

    const range = getTodayRangeIso()
    const res = await apiShareTodayTasks(range)
    toast({ title: "작업 공유 완료!", description: `${res.updated}개의 작업이 대시보드에 공유되었습니다.` })

    setTimeout(() => {
      router.push("/dashboard")
    }, 600)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-4xl font-bold tracking-tight text-balance">
              좋은 아침입니다, <span className="text-primary">{user.name}</span>님
            </h1>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-end gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-2 shadow-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-lg sm:text-xl font-semibold tracking-tight">{formatKoreanDate(today)}</span>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">{todayQuote}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-2xl font-bold">
                    {completedCount} / {tasks.length}
                  </span>
                  <span className="text-muted-foreground ml-2">완료</span>
                </div>
                {tasks.length > 0 && (
                  <Button onClick={shareAllTasks} className="gap-2">
                    <Share2 className="w-4 h-4" />
                    대시보드에 공유
                  </Button>
                )}
              </div>

              <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-6">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{
                    width: tasks.length > 0 ? `${(completedCount / tasks.length) * 100}%` : "0%",
                  }}
                />
              </div>

              <div className="flex gap-2 mb-6">
                <Select value={newTaskCategory} onValueChange={(v) => setNewTaskCategory(v as MorningTaskCategory)}>
                  <SelectTrigger className="w-[140px]">
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
                <Input
                  placeholder="새로운 작업 추가..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    if (editingTaskId) updateTask()
                    else addTask()
                  }}
                  className="flex-1"
                />
                {editingTaskId ? (
                  <>
                    <Button variant="outline" size="icon" onClick={cancelEdit} aria-label="수정 취소">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button onClick={updateTask} disabled={!newTaskContent.trim()} className="gap-2">
                      <Check className="w-4 h-4" />
                      수정
                    </Button>
                  </>
                ) : (
                  <Button onClick={addTask} size="icon" aria-label="작업 추가">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">오늘의 첫 번째 작업을 추가해보세요!</div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`${task.completed ? "line-through opacity-60" : ""}`}>{task.content}</div>
                          {isLateMorningTodoCreatedAt(task.createdAt) && (
                            <Badge variant="destructive" className="shrink-0">
                              지각
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {task.category === "learning" && "수능"}
                          {task.category === "meditation" && "내신"}
                          {task.category === "reading" && "비교과(독서)"}
                          {task.category === "academy" && "학원/과외"}
                          {task.category === "workout" && "운동"}
                          {task.category === "other" && "기타"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditTask(task)}
                        aria-label="작업 수정"
                        className={editingTaskId === task.id ? "text-primary" : ""}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
