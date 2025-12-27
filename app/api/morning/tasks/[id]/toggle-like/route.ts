import { NextResponse } from "next/server"

import { getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const { id: taskId } = await ctx.params
  if (!taskId) return jsonError("Missing task id")

  const supabase = getSupabaseServerClient()

  // Check existing like
  const { data: existing, error: existingError } = await supabase
    .from("morning_task_likes")
    .select("task_id")
    .eq("task_id", taskId)
    .eq("user_id", authResult.userId)
    .limit(1)

  if (existingError) return jsonError(existingError.message, 500)
  const alreadyLiked = Array.isArray(existing) && existing.length > 0

  if (alreadyLiked) {
    const { error: delError } = await supabase
      .from("morning_task_likes")
      .delete()
      .eq("task_id", taskId)
      .eq("user_id", authResult.userId)
    if (delError) return jsonError(delError.message, 500)
  } else {
    const { error: insError } = await supabase
      .from("morning_task_likes")
      .insert({ task_id: taskId, user_id: authResult.userId })
    if (insError) return jsonError(insError.message, 500)
  }

  // Return updated like count
  const { data: counts, error: countsError } = await supabase.rpc("get_morning_task_like_counts", { task_ids: [taskId] })
  if (countsError) return jsonError(countsError.message, 500)
  const likesCount = Number(counts?.[0]?.likes_count ?? 0)

  return NextResponse.json({ liked: !alreadyLiked, likesCount })
}


