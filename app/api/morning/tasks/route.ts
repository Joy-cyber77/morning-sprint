import { NextResponse } from "next/server"
import { z } from "zod"

import { getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

const bodySchema = z.object({
  content: z.string().trim().min(1).max(500),
  category: z.enum(["learning", "meditation", "reading", "academy", "workout", "other"]),
  userName: z.string().trim().min(1).max(80),
})

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

export async function POST(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("morning_tasks")
    .insert({
      user_id: authResult.userId,
      user_name: parsed.data.userName,
      content: parsed.data.content,
      category: parsed.data.category,
    })
    .select("*")
    .single()

  if (error) return jsonError(error.message, 500)
  return NextResponse.json(mapTaskRow(data))
}


