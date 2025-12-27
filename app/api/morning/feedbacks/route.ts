import { NextResponse } from "next/server"
import { z } from "zod"

import { clampRangeDays, getSupabaseServerClient, isoStringSchema, jsonError, requireUserId } from "@/app/api/morning/_utils"

const createSchema = z.object({
  toUserId: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(1000),
  fromUserName: z.string().trim().min(1).max(80),
})

function mapFeedbackRow(row: any) {
  return {
    id: row.id,
    toUserId: row.to_user_id,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    content: row.content,
    createdAt: row.created_at,
    legacyId: row.legacy_id ?? null,
    comments: [],
  }
}

function mapCommentRow(row: any) {
  return {
    id: row.id,
    feedbackId: row.feedback_id,
    fromUserId: row.from_user_id,
    fromUserName: row.from_user_name,
    content: row.content,
    createdAt: row.created_at,
    legacyId: row.legacy_id ?? null,
  }
}

export async function GET(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const url = new URL(req.url)
  const toUserIdsCsv = url.searchParams.get("toUserIds") ?? ""
  const toUserIds = toUserIdsCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const start = url.searchParams.get("start")
  const end = url.searchParams.get("end")

  const parsedRange = z.object({ start: isoStringSchema, end: isoStringSchema }).safeParse({ start, end })
  if (!parsedRange.success) return jsonError(parsedRange.error.issues[0]?.message ?? "Invalid range")
  if (!clampRangeDays(parsedRange.data.start, parsedRange.data.end, 14)) return jsonError("Invalid range (too large)")

  if (toUserIds.length === 0) return NextResponse.json([])

  const supabase = getSupabaseServerClient()

  const { data: feedbacks, error: fbError } = await supabase
    .from("morning_feedbacks")
    .select("*")
    .in("to_user_id", toUserIds)
    .gte("created_at", parsedRange.data.start)
    .lte("created_at", parsedRange.data.end)
    .order("created_at", { ascending: false })

  if (fbError) return jsonError(fbError.message, 500)
  const mapped = (feedbacks ?? []).map(mapFeedbackRow)
  const feedbackIds = mapped.map((f) => f.id)

  if (feedbackIds.length === 0) return NextResponse.json([])

  const { data: comments, error: cError } = await supabase
    .from("morning_feedback_comments")
    .select("*")
    .in("feedback_id", feedbackIds)
    .order("created_at", { ascending: true })

  if (cError) return jsonError(cError.message, 500)

  const byFeedbackId = new Map<string, any[]>()
  for (const c of comments ?? []) {
    const fid = c.feedback_id as string
    const arr = byFeedbackId.get(fid) ?? []
    arr.push(mapCommentRow(c))
    byFeedbackId.set(fid, arr)
  }

  return NextResponse.json(
    mapped.map((f) => ({
      ...f,
      comments: byFeedbackId.get(f.id) ?? [],
    })),
  )
}

export async function POST(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const json = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("morning_feedbacks")
    .insert({
      to_user_id: parsed.data.toUserId,
      from_user_name: parsed.data.fromUserName,
      content: parsed.data.content,
    })
    .select("*")
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ ...mapFeedbackRow(data), comments: [] })
}


