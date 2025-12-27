import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config"
import Link from "next/link"

export const dynamic = "force-dynamic"

type ProbeResult =
  | {
      name: string
      url: string
      ok: boolean
      status: number
      statusText: string
      snippet: string
    }
  | {
      name: string
      url: string
      ok: false
      error: string
    }

async function probe(params: { name: string; url: string; accept?: string }): Promise<ProbeResult> {
  const { name, url, accept } = params
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(accept ? { Accept: accept } : {}),
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
      },
    })

    const text = await res.text()
    const snippet = text.length > 800 ? `${text.slice(0, 800)}\n... (truncated)` : text

    return {
      name,
      url,
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      snippet,
    }
  } catch (e) {
    return {
      name,
      url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export default async function SupabaseDebugPage() {
  const targets: Array<{ name: string; url: string; accept?: string }> = [
    // Base URL reachability (will often return 404/200 depending on config, but confirms connectivity).
    { name: "Base", url: supabaseUrl },
    // Auth service (often exposes a health endpoint; status is still useful even if not enabled).
    { name: "Auth health", url: `${supabaseUrl}/auth/v1/health` },
    // PostgREST OpenAPI (no tables required; may still be restricted depending on project config).
    { name: "REST OpenAPI", url: `${supabaseUrl}/rest/v1/`, accept: "application/openapi+json" },
  ]

  const results = await Promise.all(targets.map((t) => probe(t)))

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Supabase 연결 확인</h1>
        <Link href="/supabase/tasks" className="text-sm underline text-muted-foreground hover:text-foreground">
          RLS + Clerk 예시로
        </Link>
      </div>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-medium">헬스체크 (테이블 없이)</h2>
        <p className="text-sm text-muted-foreground">
          아래 요청들이 성공/실패 여부와 무관하게 “Supabase 프로젝트에 네트워크로 도달하고, 키(apikey)로 응답을 받는지”를 확인합니다.
        </p>
        <pre className="text-sm whitespace-pre-wrap">
          {JSON.stringify(
            results.map((r) => {
              if ("error" in r) return r
              return {
                name: r.name,
                url: r.url,
                ok: r.ok,
                status: r.status,
                statusText: r.statusText,
                snippet: r.snippet,
              }
            }),
            null,
            2
          )}
        </pre>
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-medium">다음 단계</h2>
        <p className="text-sm text-muted-foreground">
          RLS가 실제로 동작하는지 확인하려면 <code>/supabase/tasks</code>로 이동해서 “내 데이터만 보이는지”를 확인하세요.
        </p>
        <p className="text-xs text-muted-foreground">
          참고: Supabase의 Clerk provider 설정 + RLS 정책이 필요합니다. 안내는 Clerk 문서 기준으로 맞춰뒀습니다.
        </p>
      </section>
    </main>
  )
}


