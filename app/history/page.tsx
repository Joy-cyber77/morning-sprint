"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, startOfDay, subDays } from "date-fns"
import { Activity, CheckCircle2, Flame, Share2, TrendingUp } from "lucide-react"
import { formatKoreanDate, isSameLocalDay } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { MorningTask } from "@/lib/morning/types"
import { apiListTasksInRange } from "@/lib/morning/api"

interface DailyStats {
  dateKey: string
  day: Date
  tasksShared: number
  tasksCompleted: number
  tasksUncompleted: number
  todosTotal: number
  todosCompleted: number
  todosUncompleted: number
}

const categoryLabels: Record<MorningTask["category"], string> = {
  learning: "수능",
  meditation: "내신",
  reading: "비교과(독서)",
  academy: "학원/과외",
  workout: "운동",
  other: "기타",
}

type CategoryFilter = "all" | MorningTask["category"]

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [history, setHistory] = useState<DailyStats[]>([])
  const [userTasks, setUserTasks] = useState<MorningTask[]>([])
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }
  }, [user, loading, router])

  const loadHistory = useCallback(async () => {
    if (!user) return

    // 최근 7일 (오늘 포함)
    const start = startOfDay(subDays(new Date(), 6))
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    try {
      const tasks = await apiListTasksInRange({ start: start.toISOString(), end: end.toISOString() })
      setUserTasks(tasks)

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const day = startOfDay(subDays(new Date(), i))
        const dateKey = format(day, "yyyy-MM-dd")

        const createdOnDay = tasks.filter((t) => isSameLocalDay(t.createdAt, day))

        // "Today's Todos" 기준: 그날 생성된 작업이 모두 완료되어야 streak 성공일로 간주
        const todosTotal = createdOnDay.length
        const todosCompleted = createdOnDay.filter((t) => t.completed).length
        const todosUncompleted = createdOnDay.filter((t) => !t.completed).length

        const tasksSharedOnDate = createdOnDay.filter((t) => t.isShared).length

        const tasksCompletedOnDate = tasks.filter((t) => t.completed && t.completedAt && isSameLocalDay(t.completedAt, day)).length

        const tasksUncompletedOnDate = createdOnDay.filter((t) => !t.completed).length

        return {
          dateKey,
          day,
          tasksShared: tasksSharedOnDate,
          tasksCompleted: tasksCompletedOnDate,
          tasksUncompleted: tasksUncompletedOnDate,
          todosTotal,
          todosCompleted,
          todosUncompleted,
        }
      }).reverse()

      setHistory(last7Days)
    } catch (e) {
      toast({
        title: "히스토리 로드 실패",
        description: e instanceof Error ? e.message : "데이터를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
      setUserTasks([])
      setHistory([])
    }
  }, [user, toast])

  const openDayDialog = (day: Date) => {
    setSelectedDay(day)
    setCategoryFilter("all")
    setIsDayDialogOpen(true)
  }

  const closeDayDialog = (open: boolean) => {
    setIsDayDialogOpen(open)
    if (!open) {
      setSelectedDay(null)
      setCategoryFilter("all")
    }
  }

  // IMPORTANT: Hooks must be called in the same order on every render.
  // Even during loading/redirect state, we still compute memoized dialog data (it will be null).
  const dayDialogData = useMemo(() => {
    if (!selectedDay) return null

    const createdOnDay = userTasks.filter((t) => isSameLocalDay(t.createdAt, selectedDay))
    const completedOnDay = userTasks.filter((t) => t.completed && t.completedAt && isSameLocalDay(t.completedAt, selectedDay))

    const sharedOnDay = createdOnDay.filter((t) => t.isShared)
    const uncompletedOnDay = createdOnDay.filter((t) => !t.completed)

    const union = new Map<string, MorningTask>()
    for (const t of createdOnDay) union.set(t.id, t)
    for (const t of completedOnDay) union.set(t.id, t)
    const allRelated = Array.from(union.values())

    const applyCategoryFilter = (tasks: MorningTask[]) => {
      if (categoryFilter === "all") return tasks
      return tasks.filter((t) => t.category === categoryFilter)
    }

    const byCategory = (tasks: MorningTask[]) => {
      const counts: Record<MorningTask["category"], number> = {
        learning: 0,
        meditation: 0,
        reading: 0,
        academy: 0,
        workout: 0,
        other: 0,
      }
      for (const t of tasks) counts[t.category] += 1
      return counts
    }

    return {
      createdOnDay,
      completedOnDay,
      sharedOnDay,
      uncompletedOnDay,
      allRelated,
      categoryCounts: byCategory(allRelated),
      filtered: {
        shared: applyCategoryFilter(sharedOnDay),
        completed: applyCategoryFilter(completedOnDay),
        uncompleted: applyCategoryFilter(uncompletedOnDay),
      },
    }
  }, [selectedDay, userTasks, categoryFilter])

  useEffect(() => {
    if (!loading && user) void loadHistory()
  }, [loading, user, loadHistory])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const totalShared = history.reduce((sum, day) => sum + day.tasksShared, 0)
  const totalCompleted = history.reduce((sum, day) => sum + day.tasksCompleted, 0)
  const avgSharedPerDay = (totalShared / 7).toFixed(1)

  // Streak: 오늘부터 거꾸로 "그날 생성된 Todos가 모두 완료된 날"을 연속으로 센 값
  const streak = (() => {
    let count = 0
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const d = history[i]
      const isSuccessDay = d.todosTotal > 0 && d.todosUncompleted === 0
      if (!isSuccessDay) break
      count += 1
    }
    return count
  })()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Sprint History</h1>
            <p className="text-muted-foreground mt-1">Track your progress over the last 7 days</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Tasks Shared</span>
              </div>
              <div className="text-3xl font-bold">{totalShared}</div>
              <div className="text-xs text-muted-foreground">{avgSharedPerDay} per day average</div>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Tasks Completed</span>
              </div>
              <div className="text-3xl font-bold">{totalCompleted}</div>
              <div className="text-xs text-muted-foreground">Last 7 days</div>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">Streak</span>
              </div>
              <div className="flex items-end gap-2">
                <Flame className="w-8 h-8 text-orange-500 dark:text-orange-400 animate-flame motion-reduce:animate-none" />
                <div className="text-3xl font-bold leading-none">
                  {streak}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">연속 완료 일수 (오늘의 Todos 전부 완료)</div>
              <div className="text-[11px] leading-snug text-muted-foreground">
                만약 오늘 하루라도 빼먹으면, 내일 이 숫자는 가차 없이 &apos;0&apos;으로 초기화(Reset) 됩니다.
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Daily Breakdown</h2>
            <div className="space-y-3">
              {history.map((day) => (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => openDayDialog(day.day)}
                  className="w-full text-left flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${formatKoreanDate(day.day)} 상세 보기`}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{format(day.day, "EEEE, MMM d")}</div>
                    <div className="text-sm text-muted-foreground">
                      {isSameLocalDay(new Date().toISOString(), day.day) ? "Today" : format(day.day, "yyyy")}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{day.tasksUncompleted}</div>
                      <div className="text-xs text-muted-foreground">Uncompleted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{day.tasksCompleted}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Dialog open={isDayDialogOpen} onOpenChange={closeDayDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDay ? formatKoreanDate(selectedDay) : "상세 보기"}</DialogTitle>
            <DialogDescription>
              선택한 날짜의 작업을 <span className="font-medium">Shared / Completed / Uncompleted</span> 상태별로 확인하세요.
            </DialogDescription>
          </DialogHeader>

          {!dayDialogData ? (
            <div className="text-sm text-muted-foreground">표시할 데이터가 없습니다.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 카테고리</SelectItem>
                      <SelectItem value="learning">수능</SelectItem>
                      <SelectItem value="meditation">내신</SelectItem>
                      <SelectItem value="reading">비교과(독서)</SelectItem>
                      <SelectItem value="academy">학원/과외</SelectItem>
                      <SelectItem value="workout">운동</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    총 {dayDialogData.allRelated.length}개 (생성 {dayDialogData.createdOnDay.length} / 완료 {dayDialogData.completedOnDay.length})
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(categoryLabels) as MorningTask["category"][]).map((cat) => (
                    <Badge key={cat} variant="secondary" className="gap-1">
                      <span>{categoryLabels[cat]}</span>
                      <span className="text-muted-foreground">{dayDialogData.categoryCounts[cat]}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                    <div className="font-semibold">Shared</div>
                    <Badge variant="outline">{dayDialogData.filtered.shared.length}</Badge>
                  </div>
                </div>
                {dayDialogData.filtered.shared.length === 0 ? (
                  <div className="text-sm text-muted-foreground">공유된 작업이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {dayDialogData.filtered.shared.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg border bg-card/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium break-words">{t.content}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{categoryLabels[t.category]}</Badge>
                              <span className="text-xs text-muted-foreground">생성: {new Date(t.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                          <Badge className="shrink-0" variant="outline">
                            {t.completed ? "Completed" : "Uncompleted"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <div className="font-semibold">Completed</div>
                    <Badge variant="outline">{dayDialogData.filtered.completed.length}</Badge>
                  </div>
                </div>
                {dayDialogData.filtered.completed.length === 0 ? (
                  <div className="text-sm text-muted-foreground">완료된 작업이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {dayDialogData.filtered.completed.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg border bg-card/50">
                        <div className="text-sm font-medium break-words">{t.content}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{categoryLabels[t.category]}</Badge>
                          {t.completedAt && (
                            <span className="text-xs text-muted-foreground">
                              완료: {new Date(t.completedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          {t.isShared && <Badge variant="outline">Shared</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div className="font-semibold">Uncompleted</div>
                    <Badge variant="outline">{dayDialogData.filtered.uncompleted.length}</Badge>
                  </div>
                </div>
                {dayDialogData.filtered.uncompleted.length === 0 ? (
                  <div className="text-sm text-muted-foreground">미완료 작업이 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {dayDialogData.filtered.uncompleted.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg border bg-card/50">
                        <div className="text-sm font-medium break-words">{t.content}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{categoryLabels[t.category]}</Badge>
                          <span className="text-xs text-muted-foreground">
                            생성: {new Date(t.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {t.isShared && <Badge variant="outline">Shared</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
