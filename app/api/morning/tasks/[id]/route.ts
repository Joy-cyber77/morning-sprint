import { NextResponse } from "next/server"
import { z } from "zod"

import { getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

const patchSchema = z
  .object({
    content: z.string().trim().min(1).max(500).optional(),
    category: z.enum(["learning", "meditation", "reading", "academy", "workout", "other"]).optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Empty patch")

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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const { id } = await ctx.params
  if (!id) return jsonError("Missing id")

  const json = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const patch: Record<string, unknown> = { ...parsed.data }
  if (typeof parsed.data.completed === "boolean") {
    patch.completed_at = parsed.data.completed ? new Date().toISOString() : null
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("morning_tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", authResult.userId)
    .select("*")
    .maybeSingle()

  if (error) return jsonError(error.message, 500)
  if (!data) return jsonError("Not found", 404)
  return NextResponse.json(mapTaskRow(data))
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const { id } = await ctx.params
  if (!id) return jsonError("Missing id")

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("morning_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", authResult.userId)
    .select("id")
    .maybeSingle()
  if (error) return jsonError(error.message, 500)
  if (!data) return jsonError("Not found", 404)

  return NextResponse.json({ ok: true })
}


