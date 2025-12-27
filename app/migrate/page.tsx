"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

type MigrationResult = {
  ok: true
  tasks: { requested: number; migrated: number }
  likes: { migrated: number }
  feedbacks: { requested: number; migrated: number }
  comments: { migrated: number }
}

const TASKS_KEY = "morning_sprint_tasks"
const FEEDBACKS_KEY = "morning_sprint_feedbacks"

export default function MigratePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)

  const canRun = useMemo(() => Boolean(user) && !loading && !running, [user, loading, running])

  async function runMigration() {
    if (!user) return
    setRunning(true)
    setResult(null)

    try {
      const tasksRaw = typeof window !== "undefined" ? localStorage.getItem(TASKS_KEY) : null
      const feedbacksRaw = typeof window !== "undefined" ? localStorage.getItem(FEEDBACKS_KEY) : null
      const tasks = tasksRaw ? JSON.parse(tasksRaw) : []
      const feedbacks = feedbacksRaw ? JSON.parse(feedbacksRaw) : []

      const res = await fetch("/api/morning/migrate/localstorage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, feedbacks }),
      })
      const json: unknown = await res.json()
      if (!res.ok) {
        const message =
          typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : "마이그레이션 실패"
        throw new Error(message)
      }

      const migrationResult = json as MigrationResult

      setResult(migrationResult)
      toast({
        title: "마이그레이션 완료",
        description: `tasks ${migrationResult.tasks.migrated}개 / feedback ${migrationResult.feedbacks.migrated}개`,
      })
    } catch (e) {
      toast({ title: "마이그레이션 실패", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  if (!loading && !user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">로컬 데이터 마이그레이션</h1>
          <p className="text-sm text-muted-foreground">
            이 페이지는 브라우저 <code>localStorage</code>(mock-db)에 남아있는 데이터를 <code>Supabase</code>의{" "}
            <code>morning_*</code> 테이블로 옮깁니다.
          </p>
          <p className="text-xs text-muted-foreground">
            안전을 위해 <span className="font-medium">현재 로그인한 본인의 데이터만</span> 마이그레이션합니다.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-semibold">1회 실행</div>
              <div className="text-sm text-muted-foreground">중복 실행해도 legacy_id 기준으로 upsert 됩니다.</div>
            </div>
            <Button onClick={() => void runMigration()} disabled={!canRun}>
              {running ? "진행 중..." : "마이그레이션 실행"}
            </Button>
          </div>

          {result && (
            <div className="text-sm rounded-md border bg-muted/20 p-4 space-y-1">
              <div>
                - tasks: {result.tasks.migrated}/{result.tasks.requested}
              </div>
              <div>- likes(내가 눌렀던 것만): {result.likes.migrated}</div>
              <div>
                - feedbacks(내가 쓴 것만): {result.feedbacks.migrated}/{result.feedbacks.requested}
              </div>
              <div>- comments(내가 쓴 것만): {result.comments.migrated}</div>
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-3">
          <div className="font-semibold">다음 단계</div>
          <div className="text-sm text-muted-foreground">
            마이그레이션 후 <code>/todos</code>에서 “대시보드에 공유”를 눌러보고, <code>/dashboard</code>에서 주간 공유가 보이는지 확인하세요.
          </div>
        </Card>
      </main>
    </div>
  )
}


