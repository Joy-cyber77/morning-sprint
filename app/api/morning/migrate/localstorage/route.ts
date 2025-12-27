import { NextResponse } from "next/server"
import { z } from "zod"

import { getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

const categorySchema = z.enum(["learning", "meditation", "reading", "academy", "workout", "other"])

const legacyTaskSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  content: z.string().min(1),
  category: categorySchema,
  completed: z.boolean(),
  completedAt: z.string().optional(),
  isShared: z.boolean(),
  createdAt: z.string().min(1),
  likes: z.array(z.string()).optional(),
})

const legacyFeedbackCommentSchema = z.object({
  id: z.string().min(1),
  feedbackId: z.string().min(1),
  fromUserId: z.string().min(1),
  fromUserName: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().min(1),
})

const legacyFeedbackSchema = z.object({
  id: z.string().min(1),
  toUserId: z.string().min(1),
  fromUserId: z.string().min(1),
  fromUserName: z.string().min(1),
  content: z.string().min(1),
  createdAt: z.string().min(1),
  comments: z.array(legacyFeedbackCommentSchema).optional(),
})

const bodySchema = z.object({
  tasks: z.array(legacyTaskSchema).optional().default([]),
  feedbacks: z.array(legacyFeedbackSchema).optional().default([]),
})

export async function POST(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const supabase = getSupabaseServerClient()

  // 1) Tasks: only migrate tasks owned by current user (RLS-safe)
  const myLegacyTasks = parsed.data.tasks.filter((t) => t.userId === authResult.userId && t.content.trim().length > 0)

  const taskRows = myLegacyTasks.map((t) => ({
    user_id: authResult.userId,
    user_name: t.userName,
    content: t.content,
    category: t.category,
    completed: t.completed,
    completed_at: t.completed ? (t.completedAt ?? null) : null,
    is_shared: t.isShared,
    shared_at: t.isShared ? t.createdAt : null,
    created_at: t.createdAt,
    updated_at: t.createdAt,
    legacy_id: t.id,
  }))

  let insertedTaskMap = new Map<string, string>() // legacy_id -> uuid
  if (taskRows.length > 0) {
    const { data: upsertedTasks, error: taskError } = await supabase
      .from("morning_tasks")
      .upsert(taskRows, { onConflict: "user_id,legacy_id" })
      .select("id,legacy_id")

    if (taskError) return jsonError(taskError.message, 500)
    for (const row of upsertedTasks ?? []) {
      if (row.legacy_id) insertedTaskMap.set(row.legacy_id as string, row.id as string)
    }
  }

  // 1.1) Likes: only migrate likes for "me" (we cannot create likes for other users due to RLS)
  const likedTaskIds: string[] = []
  for (const t of myLegacyTasks) {
    const likes = t.likes ?? []
    if (!likes.includes(authResult.userId)) continue
    const newId = insertedTaskMap.get(t.id)
    if (newId) likedTaskIds.push(newId)
  }

  if (likedTaskIds.length > 0) {
    const likeRows = likedTaskIds.map((taskId) => ({ task_id: taskId, user_id: authResult.userId }))
    const { error: likeError } = await supabase
      .from("morning_task_likes")
      .upsert(likeRows, { onConflict: "task_id,user_id" })

    if (likeError) return jsonError(likeError.message, 500)
  }

  // 2) Feedbacks: only migrate feedbacks written by me (RLS-safe)
  const myLegacyFeedbacks = parsed.data.feedbacks.filter((f) => f.fromUserId === authResult.userId && f.content.trim().length > 0)
  const feedbackRows = myLegacyFeedbacks.map((f) => ({
    to_user_id: f.toUserId,
    from_user_id: authResult.userId,
    from_user_name: f.fromUserName,
    content: f.content,
    created_at: f.createdAt,
    legacy_id: f.id,
  }))

  let feedbackIdMap = new Map<string, string>() // legacy feedback id -> uuid
  if (feedbackRows.length > 0) {
    const { data: upsertedFeedbacks, error: fbError } = await supabase
      .from("morning_feedbacks")
      .upsert(feedbackRows, { onConflict: "legacy_id" })
      .select("id,legacy_id")

    if (fbError) return jsonError(fbError.message, 500)
    for (const row of upsertedFeedbacks ?? []) {
      if (row.legacy_id) feedbackIdMap.set(row.legacy_id as string, row.id as string)
    }
  }

  // 3) Comments: only migrate comments written by me (RLS-safe)
  const myLegacyComments = myLegacyFeedbacks.flatMap((f) => (f.comments ?? []).filter((c) => c.fromUserId === authResult.userId))
  const commentRows = myLegacyComments
    .map((c) => {
      const newFeedbackId = feedbackIdMap.get(c.feedbackId)
      if (!newFeedbackId) return null
      return {
        feedback_id: newFeedbackId,
        from_user_id: authResult.userId,
        from_user_name: c.fromUserName,
        content: c.content,
        created_at: c.createdAt,
        legacy_id: c.id,
      }
    })
    .filter(Boolean) as Array<Record<string, unknown>>

  if (commentRows.length > 0) {
    const { error: cError } = await supabase
      .from("morning_feedback_comments")
      .upsert(commentRows, { onConflict: "legacy_id" })
    if (cError) return jsonError(cError.message, 500)
  }

  return NextResponse.json({
    ok: true,
    tasks: { requested: parsed.data.tasks.length, migrated: myLegacyTasks.length },
    likes: { migrated: likedTaskIds.length },
    feedbacks: { requested: parsed.data.feedbacks.length, migrated: myLegacyFeedbacks.length },
    comments: { migrated: commentRows.length },
  })
}


