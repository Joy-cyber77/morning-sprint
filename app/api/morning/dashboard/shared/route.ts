import { NextResponse } from "next/server"

import { clampRangeDays, dateRangeSchema, getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

function mapTaskRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    category: row.category,
    completed: row.completed,
    completedAt: row.completed_at ?? undefined,
    isShared: row.is_shared,
    sharedAt: row.shared_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    legacyId: row.legacy_id ?? null,
  }
}

export async function GET(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const url = new URL(req.url)
  const parsed = dateRangeSchema.safeParse({
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
  })
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid range")
  if (!clampRangeDays(parsed.data.start, parsed.data.end, 14)) return jsonError("Invalid range (too large)")

  const supabase = getSupabaseServerClient()
  const { data: tasks, error: tasksError } = await supabase
    .from("morning_tasks")
    .select("*")
    .eq("is_shared", true)
    .gte("created_at", parsed.data.start)
    .lte("created_at", parsed.data.end)
    .order("created_at", { ascending: false })

  if (tasksError) return jsonError(tasksError.message, 500)
  const mapped = (tasks ?? []).map(mapTaskRow)
  const taskIds = mapped.map((t) => t.id)

  if (taskIds.length === 0) return NextResponse.json([])

  // Like counts (RLS-safe)
  const { data: counts, error: countsError } = await supabase.rpc("get_morning_task_like_counts", { task_ids: taskIds })
  if (countsError) return jsonError(countsError.message, 500)

  const countsMap = new Map<string, number>()
  for (const row of counts ?? []) {
    countsMap.set(row.task_id, Number(row.likes_count ?? 0))
  }

  // Liked-by-me set
  const { data: myLikes, error: myLikesError } = await supabase
    .from("morning_task_likes")
    .select("task_id")
    .in("task_id", taskIds)
    .eq("user_id", authResult.userId)

  if (myLikesError) return jsonError(myLikesError.message, 500)
  const likedSet = new Set((myLikes ?? []).map((r) => r.task_id as string))

  return NextResponse.json(
    mapped.map((t) => ({
      ...t,
      likesCount: countsMap.get(t.id) ?? 0,
      likedByMe: likedSet.has(t.id),
    })),
  )
}


