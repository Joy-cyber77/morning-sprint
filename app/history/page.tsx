"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  type Post,
  type SprintHistory,
  type Task,
  getHistory,
  getPosts,
  getTasks,
  setHistory as setHistoryDB,
  setPosts,
  setTasks,
} from "@/lib/mock-db"
import { format, startOfDay, subDays } from "date-fns"
import { Activity, CheckCircle2, Download, Flame, Share2, TrendingUp, Upload } from "lucide-react"
import { formatKoreanDate, isSameLocalDay } from "@/lib/utils"
import { parseCsvWithHeaders, stringifyCsv } from "@/lib/csv"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DailyStats {
  dateKey: string
  day: Date
  tasksShared: number
  tasksCompleted: number
  tasksUncompleted: number
}

const categoryLabels: Record<Task["category"], string> = {
  learning: "수능",
  meditation: "내신",
  reading: "비교과(독서)",
  academy: "학원/과외",
  workout: "운동",
  other: "기타",
}

type CategoryFilter = "all" | Task["category"]

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [history, setHistory] = useState<DailyStats[]>([])
  const [userTasks, setUserTasks] = useState<Task[]>([])
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")

  type BackupKind = "tasks" | "posts" | "history"
  type ImportMode = "merge" | "replace"

  const [backupKind, setBackupKind] = useState<BackupKind>("tasks")
  const [importMode, setImportMode] = useState<ImportMode>("merge")
  const [mapToCurrentUser, setMapToCurrentUser] = useState(true)
  const [pendingImport, setPendingImport] = useState<{
    kind: BackupKind
    fileName: string
    count: number
    items: Array<Task | Post | SprintHistory>
  } | null>(null)
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      calculateHistory()
    }
  }, [user, loading, router])

  const calculateHistory = () => {
    if (!user) return

    const allTasks = getTasks().filter((t) => t.userId === user.id)
    setUserTasks(allTasks)

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), i))
      const dateKey = format(day, "yyyy-MM-dd")

      const tasksSharedOnDate = allTasks.filter((t) => t.isShared && isSameLocalDay(t.createdAt, day)).length

      const tasksCompletedOnDate = allTasks.filter((t) => t.completed && t.completedAt && isSameLocalDay(t.completedAt, day))
        .length

      const tasksUncompletedOnDate = allTasks.filter((t) => !t.completed && isSameLocalDay(t.createdAt, day)).length

      return {
        dateKey,
        day,
        tasksShared: tasksSharedOnDate,
        tasksCompleted: tasksCompletedOnDate,
        tasksUncompleted: tasksUncompletedOnDate,
      }
    }).reverse()

    setHistory(last7Days)
  }

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const safeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const parseBoolean = (raw: string) => {
    const v = raw.trim().toLowerCase()
    return v === "true" || v === "1" || v === "yes" || v === "y"
  }

  const parseLikes = (raw: string): string[] => {
    const v = raw.trim()
    if (!v) return []
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) return parsed.map(String)
      return []
    } catch {
      // Fallback: "a|b|c" or "a;b;c"
      if (v.includes("|")) return v.split("|").map((s) => s.trim()).filter(Boolean)
      if (v.includes(";")) return v.split(";").map((s) => s.trim()).filter(Boolean)
      return [v]
    }
  }

  const exportCsv = () => {
    if (!user) return

    if (backupKind === "tasks") {
      const myTasks = getTasks().filter((t) => t.userId === user.id)
      const headers = ["id", "userId", "userName", "content", "category", "completed", "isShared", "createdAt", "completedAt", "likes"]
      const rows = myTasks.map((t) => [
        t.id,
        t.userId,
        t.userName,
        t.content,
        t.category,
        t.completed,
        t.isShared,
        t.createdAt,
        t.completedAt ?? "",
        JSON.stringify(t.likes ?? []),
      ])
      const csv = stringifyCsv(headers, rows)
      downloadTextFile(`morning-sprint_tasks_${user.id}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`, csv)
      toast({ title: "내보내기 완료", description: `Tasks ${myTasks.length}개 CSV 다운로드가 시작되었습니다.` })
      return
    }

    if (backupKind === "posts") {
      const myPosts = getPosts().filter((p) => p.userId === user.id)
      const headers = ["id", "userId", "userName", "content", "category", "createdAt", "likes"]
      const rows = myPosts.map((p) => [
        p.id,
        p.userId,
        p.userName,
        p.content,
        p.category,
        p.createdAt,
        JSON.stringify(p.likes ?? []),
      ])
      const csv = stringifyCsv(headers, rows)
      downloadTextFile(`morning-sprint_posts_${user.id}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`, csv)
      toast({ title: "내보내기 완료", description: `Posts ${myPosts.length}개 CSV 다운로드가 시작되었습니다.` })
      return
    }

    const myHistory = getHistory().filter((h) => h.userId === user.id)
    const headers = ["id", "userId", "date", "tasksCount", "tasksCompleted"]
    const rows = myHistory.map((h) => [h.id, h.userId, h.date, h.tasksCount, h.tasksCompleted])
    const csv = stringifyCsv(headers, rows)
    downloadTextFile(`morning-sprint_history_${user.id}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`, csv)
    toast({ title: "내보내기 완료", description: `History ${myHistory.length}개 CSV 다운로드가 시작되었습니다.` })
  }

  const parseImportFile = async (file: File) => {
    if (!user) return
    const text = await file.text()
    const { headers, rows } = parseCsvWithHeaders(text)

    const requireHeaders = (required: string[]) => {
      const missing = required.filter((h) => !headers.includes(h))
      if (missing.length > 0) {
        throw new Error(`필수 컬럼이 없습니다: ${missing.join(", ")}`)
      }
    }

    if (backupKind === "tasks") {
      requireHeaders(["content", "category", "completed", "isShared", "createdAt"])
      const allowedCategories: Task["category"][] = ["learning", "meditation", "reading", "academy", "workout", "other"]
      const items: Task[] = rows
        .filter((r) => (r.content ?? "").trim().length > 0)
        .map((r) => {
          const categoryRaw = (r.category ?? "other").trim() as Task["category"]
          const category = allowedCategories.includes(categoryRaw) ? categoryRaw : "other"
          const completed = parseBoolean(r.completed ?? "false")
          const isShared = parseBoolean(r.isShared ?? "false")
          const createdAt = (r.createdAt ?? "").trim() || new Date().toISOString()
          const completedAt = (r.completedAt ?? "").trim() || undefined
          const likes = parseLikes(r.likes ?? "")

          const id = (r.id ?? "").trim() || safeId()
          const userId = mapToCurrentUser ? user.id : ((r.userId ?? "").trim() || user.id)
          const userName = mapToCurrentUser ? user.name : ((r.userName ?? "").trim() || user.name)

          return {
            id,
            userId,
            userName,
            content: (r.content ?? "").trim(),
            category,
            completed,
            isShared,
            createdAt,
            completedAt: completed ? completedAt : undefined,
            likes,
          }
        })

      setPendingImport({ kind: "tasks", fileName: file.name, count: items.length, items })
      toast({ title: "가져오기 준비됨", description: `Tasks ${items.length}개를 적용할 준비가 됐습니다.` })
      return
    }

    if (backupKind === "posts") {
      requireHeaders(["content", "category", "createdAt"])
      const allowedCategories: Post["category"][] = ["reading", "workout", "meditation", "learning", "other"]
      const items: Post[] = rows
        .filter((r) => (r.content ?? "").trim().length > 0)
        .map((r) => {
          const categoryRaw = (r.category ?? "other").trim() as Post["category"]
          const category = allowedCategories.includes(categoryRaw) ? categoryRaw : "other"
          const createdAt = (r.createdAt ?? "").trim() || new Date().toISOString()
          const likes = parseLikes(r.likes ?? "")
          const id = (r.id ?? "").trim() || safeId()
          const userId = mapToCurrentUser ? user.id : ((r.userId ?? "").trim() || user.id)
          const userName = mapToCurrentUser ? user.name : ((r.userName ?? "").trim() || user.name)

          return { id, userId, userName, content: (r.content ?? "").trim(), category, createdAt, likes }
        })

      setPendingImport({ kind: "posts", fileName: file.name, count: items.length, items })
      toast({ title: "가져오기 준비됨", description: `Posts ${items.length}개를 적용할 준비가 됐습니다.` })
      return
    }

    requireHeaders(["date", "tasksCount", "tasksCompleted"])
    const items: SprintHistory[] = rows
      .filter((r) => (r.date ?? "").trim().length > 0)
      .map((r) => {
        const id = (r.id ?? "").trim() || safeId()
        const userId = mapToCurrentUser ? user.id : ((r.userId ?? "").trim() || user.id)
        const date = (r.date ?? "").trim()
        const tasksCount = Number.parseInt((r.tasksCount ?? "0").trim(), 10) || 0
        const tasksCompleted = Number.parseInt((r.tasksCompleted ?? "0").trim(), 10) || 0
        return { id, userId, date, tasksCount, tasksCompleted }
      })

    setPendingImport({ kind: "history", fileName: file.name, count: items.length, items })
    toast({ title: "가져오기 준비됨", description: `History ${items.length}개를 적용할 준비가 됐습니다.` })
  }

  const applyImport = () => {
    if (!user || !pendingImport) return
    const kind = pendingImport.kind
    const count = pendingImport.count

    if (kind === "tasks") {
      const imported = pendingImport.items as Task[]
      const all = getTasks()
      const base = importMode === "replace" ? all.filter((t) => t.userId !== user.id) : all
      const byId = new Map<string, Task>(base.map((t) => [t.id, t]))
      for (const t of imported) byId.set(t.id, t)
      setTasks(Array.from(byId.values()))
      setPendingImport(null)
      toast({ title: "가져오기 완료", description: `Tasks ${count}개가 ${importMode === "replace" ? "덮어쓰기" : "병합"}로 적용되었습니다.` })
      calculateHistory()
      return
    }

    if (kind === "posts") {
      const imported = pendingImport.items as Post[]
      const all = getPosts()
      const base = importMode === "replace" ? all.filter((p) => p.userId !== user.id) : all
      const byId = new Map<string, Post>(base.map((p) => [p.id, p]))
      for (const p of imported) byId.set(p.id, p)
      setPosts(Array.from(byId.values()))
      setPendingImport(null)
      toast({ title: "가져오기 완료", description: `Posts ${count}개가 ${importMode === "replace" ? "덮어쓰기" : "병합"}로 적용되었습니다.` })
      return
    }

    const imported = pendingImport.items as SprintHistory[]
    const all = getHistory()
    const base = importMode === "replace" ? all.filter((h) => h.userId !== user.id) : all
    const byId = new Map<string, SprintHistory>(base.map((h) => [h.id, h]))
    for (const h of imported) byId.set(h.id, h)
    setHistoryDB(Array.from(byId.values()))
    setPendingImport(null)
    toast({ title: "가져오기 완료", description: `History ${count}개가 ${importMode === "replace" ? "덮어쓰기" : "병합"}로 적용되었습니다.` })
  }

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

    const union = new Map<string, Task>()
    for (const t of createdOnDay) union.set(t.id, t)
    for (const t of completedOnDay) union.set(t.id, t)
    const allRelated = Array.from(union.values())

    const applyCategoryFilter = (tasks: Task[]) => {
      if (categoryFilter === "all") return tasks
      return tasks.filter((t) => t.category === categoryFilter)
    }

    const byCategory = (tasks: Task[]) => {
      const counts: Record<Task["category"], number> = {
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
                  {history.filter((d) => d.tasksShared > 0 || d.tasksCompleted > 0).length}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Active days</div>
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

          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">데이터 백업/복구 (CSV)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  localStorage 기반 데이터를 CSV로 내보내고, 다른 브라우저/PC에서 다시 가져올 수 있습니다.
                </p>
              </div>
              <Button variant="outline" onClick={exportCsv} className="gap-2 shrink-0">
                <Download className="w-4 h-4" />
                내보내기
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">데이터 종류</span>
                  <Select value={backupKind} onValueChange={(v) => { setBackupKind(v as BackupKind); setPendingImport(null) }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="posts">Posts</SelectItem>
                      <SelectItem value="history">SprintHistory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">가져오기 모드</span>
                  <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merge">병합(추천)</SelectItem>
                      <SelectItem value="replace">덮어쓰기(주의)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={mapToCurrentUser} onCheckedChange={(v) => setMapToCurrentUser(Boolean(v))} />
                <div className="text-sm">
                  <span className="font-medium">현재 로그인 사용자로 매핑</span>
                  <span className="text-muted-foreground"> (권장: 다른 기기에서 내 데이터가 바로 보이게)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      await parseImportFile(file)
                    } catch (err) {
                      setPendingImport(null)
                      toast({
                        title: "가져오기 실패",
                        description: err instanceof Error ? err.message : "CSV를 읽는 중 오류가 발생했습니다.",
                      })
                    } finally {
                      // allow selecting same file again
                      e.currentTarget.value = ""
                    }
                  }}
                />

                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    className="gap-2"
                    disabled={!pendingImport || pendingImport.kind !== backupKind || pendingImport.count === 0}
                    onClick={() => {
                      if (!pendingImport) return
                      if (importMode === "replace") setConfirmReplaceOpen(true)
                      else applyImport()
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    가져오기 적용
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!pendingImport}
                    onClick={() => setPendingImport(null)}
                  >
                    초기화
                  </Button>
                </div>
              </div>

              {pendingImport && (
                <div className="text-sm text-muted-foreground">
                  준비됨: <span className="font-medium text-foreground">{pendingImport.fileName}</span> •{" "}
                  {pendingImport.kind} {pendingImport.count}개
                </div>
              )}
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
                  {(Object.keys(categoryLabels) as Task["category"][]).map((cat) => (
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

      <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>덮어쓰기 적용</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 데이터 종류에 대해 <span className="font-medium">현재 사용자</span>의 기존 데이터를 삭제하고,
              CSV 내용으로 <span className="font-medium">완전히 교체</span>합니다. 계속할까요?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                setConfirmReplaceOpen(false)
                applyImport()
              }}
            >
              덮어쓰기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
