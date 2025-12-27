import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import AddTaskForm from "./AddTaskForm"
import { createClerkSupabaseServerClient } from "@/lib/supabase/clerk-server"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

type TaskRow = {
  id: number
  name: string
  user_id: string
}

export default async function SupabaseTasksPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const supabase = createClerkSupabaseServerClient()
  const { data, error } = await supabase.from("tasks").select("id,name,user_id").order("id", { ascending: false })

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Supabase Tasks (RLS + Clerk)</h1>
          <p className="text-sm text-muted-foreground">
            이 페이지는 <span className="font-medium">Clerk 세션 토큰</span>으로 Supabase에 접근해서, RLS로 사용자별 데이터가 격리되는지 확인합니다.
          </p>
        </div>
        <Link href="/supabase" className="text-sm underline text-muted-foreground hover:text-foreground">
          연결 점검으로
        </Link>
      </div>

      <Card className="p-4 space-y-3">
        <div className="font-medium">새 Task 추가</div>
        <AddTaskForm />
        <div className="text-xs text-muted-foreground">
          테이블/정책이 정상이라면 insert 시 <code>user_id</code>가 자동으로 현재 Clerk 사용자 ID(sub)로 채워집니다.
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">내 Task 목록</div>
          <div className="text-xs text-muted-foreground">userId: {userId}</div>
        </div>

        {error ? (
          <pre className="text-sm whitespace-pre-wrap rounded-md border p-3 bg-muted/20">
            {JSON.stringify(
              {
                message: "Supabase query failed",
                error: error.message,
                hint:
                  "대부분 (1) Supabase에서 Clerk provider 활성화, (2) RLS 정책/테이블 생성, (3) Clerk Supabase 통합 활성화(토큰에 role=authenticated claim) 중 하나가 빠졌을 때 발생합니다.",
              },
              null,
              2
            )}
          </pre>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground">아직 task가 없습니다.</div>
        ) : (
          <ul className="space-y-2">
            {(data as TaskRow[]).map((t) => (
              <li key={t.id} className="rounded-md border p-3">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  id: {t.id} · user_id: {t.user_id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}


