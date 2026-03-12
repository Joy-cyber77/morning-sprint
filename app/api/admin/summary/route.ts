import { NextResponse } from "next/server"
import { clerkClient, currentUser } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

import { jsonError } from "@/app/api/morning/_utils"
import { getClerkDisplayName, getClerkPrimaryEmail, isAdminUser } from "@/lib/clerk"
import { supabaseUrl } from "@/lib/supabase/config"

type AdminUserRow = {
  id: string
  name: string
  email: string | null
  isAdmin: boolean
  createdAt?: string | null
}

type SharedTaskRow = {
  id: string
  userId: string
  userName: string
  content: string
  category: string
  createdAt: string
  sharedAt?: string
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
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

function mapTaskRow(row: any): SharedTaskRow {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
    sharedAt: row.shared_at ?? undefined,
  }
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.res

  const url = new URL(req.url)
  const parsed = z
    .object({
      recentLimit: z.coerce.number().int().min(1).max(50).optional(),
    })
    .safeParse({ recentLimit: url.searchParams.get("recentLimit") ?? undefined })

  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid params")
  const recentLimit = parsed.data.recentLimit ?? 10

  const serviceRoleKey = getServiceRoleKey()
  if (!serviceRoleKey) {
    return jsonError("Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is required for admin summary", 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const clerkUsers = await listAllClerkUsers()
  const adminEmailsCsv = process.env.ADMIN_EMAILS ?? process.env.NEXT_PUBLIC_ADMIN_EMAILS

  const users: AdminUserRow[] = clerkUsers.map((u: any) => ({
    id: u.id,
    name: getClerkDisplayName(u),
    email: getClerkPrimaryEmail(u),
    isAdmin: isAdminUser({ user: u, adminEmailsCsv }),
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
  }))

  users.sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
    const n = a.name.localeCompare(b.name, "ko-KR")
    if (n !== 0) return n
    return a.id.localeCompare(b.id)
  })

  const { count: totalSharedTasks, error: countError } = await supabase
    .from("morning_tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_shared", true)

  if (countError) return jsonError(countError.message, 500)

  const { data: recentRows, error: recentError } = await supabase
    .from("morning_tasks")
    .select("*")
    .eq("is_shared", true)
    .order("created_at", { ascending: false })
    .limit(recentLimit)

  if (recentError) return jsonError(recentError.message, 500)

  return NextResponse.json(
    {
      totalUsers: users.length,
      totalSharedTasks: totalSharedTasks ?? 0,
      users,
      recentSharedTasks: (recentRows ?? []).map(mapTaskRow),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}


