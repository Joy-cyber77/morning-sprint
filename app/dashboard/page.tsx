"use client"

import { Card } from "@/components/ui/card"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { type Feedback, type Task, addFeedback, addFeedbackComment, getFeedbacks, getTasks, getUsers } from "@/lib/mock-db"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, MessageCircle, RefreshCw, Send } from "lucide-react"
import { cn, isSameLocalDay } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  // 주간(월~일) 범위를 기준으로 로드한 공유 작업 목록
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<"all" | Task["category"]>("all")
  const [userFilter, setUserFilter] = useState<string>("all")

  // 피드백/댓글
  const [feedbacks, setFeedbacksState] = useState<Feedback[]>([])
  const [feedbackDialogToUserId, setFeedbackDialogToUserId] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState("")
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  // 주간 캘린더 상태
  const [weekAnchorDate, setWeekAnchorDate] = useState<Date>(() => new Date())
  // null이면 주간 전체, Date면 해당 날짜(하루)만 필터링
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const pad2 = (n: number) => String(n).padStart(2, "0")
  const toLocalDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

  const getWeekRangeMonToSun = (anchor: Date) => {
    const base = new Date(anchor)
    base.setHours(0, 0, 0, 0)
    const day = base.getDay() // 0(Sun)~6(Sat)
    const daysSinceMon = (day + 6) % 7 // Mon=0 ... Sun=6
    const start = new Date(base)
    start.setDate(base.getDate() - daysSinceMon)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRangeMonToSun(weekAnchorDate), [weekAnchorDate])

  const isWithinLocalRange = (isoDateString: string, start: Date, end: Date) => {
    const d = new Date(isoDateString)
    return d >= start && d <= end
  }

  const loadTasks = useCallback(() => {
    const allTasks = getTasks()
    const sharedTasksInWeek = allTasks.filter((t) => t.isShared && isWithinLocalRange(t.createdAt, weekStart, weekEnd))
    setTasks(sharedTasksInWeek)
  }, [weekStart, weekEnd])

  const loadFeedbacks = useCallback(() => {
    setFeedbacksState(getFeedbacks())
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      loadTasks()
      loadFeedbacks()
      const interval = setInterval(() => {
        loadTasks()
        loadFeedbacks()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user, loading, router, loadTasks, loadFeedbacks])

  const users = getUsers()
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const feedbackToUserName = feedbackDialogToUserId ? userNameById.get(feedbackDialogToUserId) : undefined
  const isSelfFeedbackDialog = Boolean(user && feedbackDialogToUserId && feedbackDialogToUserId === user.id)

  const openFeedbackDialog = (toUserId: string) => {
    setFeedbackDialogToUserId(toUserId)
    setFeedbackDraft("")
  }

  const submitFeedback = () => {
    if (!user || !feedbackDialogToUserId) return
    const content = feedbackDraft.trim()
    if (!content) return

    addFeedback({ toUserId: feedbackDialogToUserId, fromUserId: user.id, fromUserName: user.name, content })
    loadFeedbacks()
    setFeedbackDraft("")
    setFeedbackDialogToUserId(null)
  }

  const submitComment = (feedbackId: string) => {
    if (!user) return
    const content = (commentDrafts[feedbackId] ?? "").trim()
    if (!content) return
    addFeedbackComment({ feedbackId, fromUserId: user.id, fromUserName: user.name, content })
    loadFeedbacks()
    setCommentDrafts((prev) => ({ ...prev, [feedbackId]: "" }))
  }

  const scopedTasks = useMemo(() => {
    if (!selectedDay) return tasks
    return tasks.filter((t) => isSameLocalDay(t.createdAt, selectedDay))
  }, [tasks, selectedDay])

  const weekDays = useMemo(() => {
    const days: { date: Date; label: string; key: string }[] = []
    const labels = ["월", "화", "수", "목", "금", "토", "일"] as const
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      d.setHours(0, 0, 0, 0)
      days.push({ date: d, label: labels[i], key: toLocalDateKey(d) })
    }
    return days
  }, [weekStart])

  const tasksCountByDayKey = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks) {
      const key = toLocalDateKey(new Date(t.createdAt))
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [tasks])

  const formatYmdDot = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`

  const tasksByUser = users
    .map((u) => ({
      user: u,
      tasks: scopedTasks.filter((t) => t.userId === u.id),
    }))
    .filter((item) => item.tasks.length > 0)

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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Learning Mate</h1>
              <p className="mt-1 text-white">
                서로의 든든한 <span className="text-primary">Pacemaker</span>가 되어주세요.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={loadTasks}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <div className="font-semibold">주간 캘린더</div>
                <div className="text-sm text-muted-foreground">
                  {formatYmdDot(weekStart)} ~ {formatYmdDot(weekEnd)} (월~일)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWeekAnchorDate(new Date())
                    setSelectedDay(null)
                  }}
                >
                  이번 주
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="이전 주"
                  onClick={() => {
                    setWeekAnchorDate((prev) => {
                      const d = new Date(prev)
                      d.setDate(d.getDate() - 7)
                      return d
                    })
                    setSelectedDay(null)
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="다음 주"
                  onClick={() => {
                    setWeekAnchorDate((prev) => {
                      const d = new Date(prev)
                      d.setDate(d.getDate() + 7)
                      return d
                    })
                    setSelectedDay(null)
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const selectedKey = selectedDay ? toLocalDateKey(selectedDay) : null
                const isActive = selectedKey === day.key
                const todayKey = toLocalDateKey(new Date())
                const isToday = todayKey === day.key
                const count = tasksCountByDayKey[day.key] ?? 0

                return (
                  <Button
                    key={day.key}
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "h-auto flex-col gap-1 py-2",
                      !isActive && "hover:text-foreground dark:hover:text-foreground",
                    )}
                    onClick={() => {
                      setSelectedDay((prev) => {
                        const prevKey = prev ? toLocalDateKey(prev) : null
                        return prevKey === day.key ? null : new Date(day.date)
                      })
                    }}
                  >
                    <span className={cn("text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {day.label}
                    </span>
                    <span className="text-sm font-semibold leading-none">{day.date.getDate()}</span>
                    {isToday && (
                      <span
                        className={cn(
                          "text-[10px] rounded-full px-2 py-0.5",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        Today
                      </span>
                    )}
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-[10px] rounded-full px-2 py-0.5",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                      >
                        {count}개
                      </span>
                    )}
                  </Button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant={selectedDay ? "outline" : "default"} size="sm" onClick={() => setSelectedDay(null)}>
                주간 전체
              </Button>
              {selectedDay && (
                <span className="text-sm text-muted-foreground">
                  {selectedDay.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}만
                  검색 중
                </span>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
              전체
            </Button>
            <Button
              variant={filter === "learning" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("learning")}
            >
              수능
            </Button>
            <Button
              variant={filter === "meditation" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("meditation")}
            >
              내신
            </Button>
            <Button
              variant={filter === "reading" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("reading")}
            >
              비교과(독서)
            </Button>
            <Button
              variant={filter === "academy" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("academy")}
            >
              학원/과외
            </Button>
            <Button
              variant={filter === "workout" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("workout")}
            >
              운동
            </Button>
            <Button variant={filter === "other" ? "default" : "outline"} size="sm" onClick={() => setFilter("other")}>
              기타
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksByUser.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">아직 공유된 작업이 없습니다.</p>
              </div>
            ) : (
              tasksByUser
                .filter((item) => userFilter === "all" || item.user.id === userFilter)
                .map((item) => {
                  const userTasksFiltered = item.tasks.filter((t) => filter === "all" || t.category === filter)
                  if (userTasksFiltered.length === 0) return null

                  const completed = userTasksFiltered.filter((t) => t.completed).length
                  const total = userTasksFiltered.length

                  return (
                    <Card key={item.user.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{item.user.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {completed}/{total}
                        </span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-4">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
                        />
                      </div>

                      <div className="space-y-2">
                        {userTasksFiltered.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-start gap-2 p-2 rounded border ${
                              task.completed ? "bg-muted/50" : "bg-card"
                            }`}
                          >
                            {task.completed && <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm ${task.completed ? "line-through opacity-60" : ""}`}>
                                {task.content}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {task.category === "learning" && "수능"}
                                {task.category === "meditation" && "내신"}
                                {task.category === "reading" && "비교과(독서)"}
                                {task.category === "academy" && "학원/과외"}
                                {task.category === "workout" && "운동"}
                                {task.category === "other" && "기타"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 피드백/댓글 */}
                      <div className="mt-5 pt-4 border-t border-border space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 text-primary" />
                            <div className="text-sm font-semibold">피드백</div>
                            <div className="text-xs text-muted-foreground">
                              {
                                feedbacks.filter((f) => f.toUserId === item.user.id).length
                              }
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => openFeedbackDialog(item.user.id)}>
                            {user.id === item.user.id ? "메모 남기기" : "피드백 남기기"}
                          </Button>
                        </div>

                        {feedbacks.filter((f) => f.toUserId === item.user.id).length === 0 ? (
                          <div className="text-sm text-muted-foreground">아직 피드백이 없습니다.</div>
                        ) : (
                          <div className="space-y-3">
                            {feedbacks
                              .filter((f) => f.toUserId === item.user.id)
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((f) => (
                                <div key={f.id} className="rounded-lg border bg-muted/20 p-3 space-y-3">
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{f.fromUserName}</span> ·{" "}
                                      {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{f.content}</div>
                                  </div>

                                  <div className="space-y-2">
                                    {(f.comments ?? []).map((c) => (
                                      <div key={c.id} className="pl-3 border-l border-border">
                                        <div className="text-[11px] text-muted-foreground">
                                          <span className="font-medium text-foreground">{c.fromUserName}</span> ·{" "}
                                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{c.content}</div>
                                      </div>
                                    ))}

                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={commentDrafts[f.id] ?? ""}
                                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [f.id]: e.target.value }))}
                                        placeholder="댓글을 입력하세요"
                                        className="h-9"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            submitComment(f.id)
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        className="h-9 gap-1"
                                        onClick={() => submitComment(f.id)}
                                        disabled={!(commentDrafts[f.id] ?? "").trim()}
                                      >
                                        <Send className="w-4 h-4" />
                                        댓글
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })
            )}
          </div>
        </div>
      </main>

      <Dialog
        open={Boolean(feedbackDialogToUserId)}
        onOpenChange={(open) => {
          if (!open) setFeedbackDialogToUserId(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isSelfFeedbackDialog ? "메모 남기기" : "피드백 남기기"}</DialogTitle>
            <DialogDescription>
              {isSelfFeedbackDialog ? (
                "오늘의 메모/회고를 남겨주세요."
              ) : feedbackToUserName ? (
                <>
                  <span className="font-medium">{feedbackToUserName}</span>님에게 응원/조언을 남겨주세요.
                </>
              ) : (
                "응원/조언을 남겨주세요."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={feedbackDraft}
              onChange={(e) => setFeedbackDraft(e.target.value)}
              placeholder={
                isSelfFeedbackDialog
                  ? "예) 오늘 잘한 점 / 내일 개선할 점 / 기억할 것"
                  : "예) 오늘 공유한 목표가 정말 좋아요! 내일은 10분만 더 해보는 건 어때요?"
              }
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFeedbackDialogToUserId(null)}>
                취소
              </Button>
              <Button onClick={submitFeedback} disabled={!feedbackDraft.trim()}>
                보내기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
