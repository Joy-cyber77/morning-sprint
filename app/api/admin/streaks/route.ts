import { NextResponse } from "next/server"
import { clerkClient, currentUser } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { format, startOfDay, subDays } from "date-fns"

import { jsonError } from "@/app/api/morning/_utils"
import { getClerkDisplayName, getClerkPrimaryEmail, isAdminUser } from "@/lib/clerk"
import { supabaseUrl } from "@/lib/supabase/config"

type TaskRow = {
  user_id: string
  created_at: string
  completed: boolean
}

type StreakRow = {
  userId: string
  name: string
  email: string | null
  streak: number
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
}

function buildDayKeys(days: number) {
  const today = startOfDay(new Date())
  const start = startOfDay(subDays(today, days - 1))
  const list: { day: Date; key: string }[] = []
  for (let i = 0; i < days; i += 1) {
    const d = startOfDay(subDays(today, days - 1 - i))
    list.push({ day: d, key: format(d, "yyyy-MM-dd") })
  }
  return { today, start, days: list }
}

function toLocalDayKey(iso: string) {
  // NOTE: server timezone 기준으로 day key를 만듭니다.
  // "유저 로컬 타임존"을 정확히 반영하려면 별도 timezone 설계가 필요합니다.
  return format(startOfDay(new Date(iso)), "yyyy-MM-dd")
}

function computeStreak(params: { dayKeys: string[]; createdByDay: Map<string, { total: number; uncompleted: number }> }) {
  const { dayKeys, createdByDay } = params
  let count = 0
  for (let i = dayKeys.length - 1; i >= 0; i -= 1) {
    const key = dayKeys[i]
    const stats = createdByDay.get(key) ?? { total: 0, uncompleted: 0 }
    const isSuccessDay = stats.total > 0 && stats.uncompleted === 0
    if (!isSuccessDay) break
    count += 1
  }
  return count
}

async function requireAdmin() {
  const user = await currentUser()
  if (!user) return { ok: false as const, res: jsonError("Unauthorized", 401) }

  const adminEmailsCsv = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS
  const isAdmin = isAdminUser({ user, adminEmailsCsv })
  if (!isAdmin) return { ok: false as const, res: jsonError("Forbidden", 403) }

  return { ok: true as const, user }
}

async function listAllClerkUsers() {
  // Clerk SDK versions differ:
  // - Some export `clerkClient` as an object
  // - Others export it as a function returning the client
  const client: any = typeof clerkClient === "function" ? await (clerkClient as any)() : (clerkClient as any)
  const usersApi: any = client?.users

  if (!usersApi?.getUserList) {
    // Typically happens when CLERK_SECRET_KEY isn't set or SDK shape mismatches.
    throw new Error("Clerk client misconfigured: cannot access users.getUserList (check CLERK_SECRET_KEY)")
  }

  const limit = 100
  let offset = 0
  const all: any[] = []

  while (true) {
    const res: any = await usersApi.getUserList({ limit, offset })
    const page = Array.isArray(res) ? res : (res?.data ?? [])
    if (!page.length) break
    all.push(...page)
    if (page.length < limit) break
    offset += limit
  }
  return all
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.res

  const url = new URL(req.url)
  const parsed = z
    .object({
      days: z.coerce.number().int().min(1).max(30).optional(),
    })
    .safeParse({ days: url.searchParams.get("days") ?? undefined })

  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid params")

  const days = parsed.data.days ?? 14
  const { start, today, days: dayList } = buildDayKeys(days)
  const dayKeys = dayList.map((d) => d.key)

  const serviceRoleKey = getServiceRoleKey()
  if (!serviceRoleKey) {
    return jsonError("Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required for admin streaks", 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // 1) 모든 유저 목록(Clerk) 조회
  const clerkUsers = await listAllClerkUsers()
  const userMeta = new Map<string, { name: string; email: string | null }>()
  for (const u of clerkUsers) {
    userMeta.set(u.id, { name: getClerkDisplayName(u), email: getClerkPrimaryEmail(u) })
  }

  // 2) 최근 N일 "생성된" tasks를 전부 조회해서 user/day별로 집계
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from("morning_tasks")
    .select("user_id, created_at, completed")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())

  if (error) return jsonError(error.message, 500)

  const tasks = (data ?? []) as TaskRow[]
  const byUser = new Map<string, Map<string, { total: number; uncompleted: number }>>()

  for (const t of tasks) {
    const userId = t.user_id
    const dayKey = toLocalDayKey(t.created_at)
    if (!byUser.has(userId)) byUser.set(userId, new Map())
    const m = byUser.get(userId)!
    const cur = m.get(dayKey) ?? { total: 0, uncompleted: 0 }
    cur.total += 1
    if (!t.completed) cur.uncompleted += 1
    m.set(dayKey, cur)
  }

  // 3) 모든 Clerk 유저를 기준으로 streak 계산(작업이 없으면 0)
  const rows: StreakRow[] = []
  for (const [userId, meta] of userMeta.entries()) {
    const createdByDay = byUser.get(userId) ?? new Map<string, { total: number; uncompleted: number }>()
    rows.push({
      userId,
      name: meta.name,
      email: meta.email,
      streak: computeStreak({ dayKeys, createdByDay }),
    })
  }

  rows.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak
    // tie-breaker: name, userId
    const n = a.name.localeCompare(b.name, "ko-KR")
    if (n !== 0) return n
    return a.userId.localeCompare(b.userId)
  })

  return NextResponse.json({
    days,
    start: start.toISOString(),
    end: end.toISOString(),
    rows,
  })
}


