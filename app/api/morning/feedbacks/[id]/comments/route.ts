import { NextResponse } from "next/server"
import { z } from "zod"

import { getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

const bodySchema = z.object({
  content: z.string().trim().min(1).max(1000),
  fromUserName: z.string().trim().min(1).max(80),
})

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const { id: feedbackId } = await ctx.params
  if (!feedbackId) return jsonError("Missing feedback id")

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from("morning_feedback_comments").insert({
    feedback_id: feedbackId,
    from_user_name: parsed.data.fromUserName,
    content: parsed.data.content,
  })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ ok: true })
}


