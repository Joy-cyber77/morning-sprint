import { NextResponse } from "next/server"

import { clampRangeDays, dateRangeSchema, getSupabaseServerClient, jsonError, requireUserId } from "@/app/api/morning/_utils"

export async function POST(req: Request) {
  const authResult = await requireUserId()
  if (!authResult.ok) return authResult.res

  const json = await req.json().catch(() => null)
  const parsed = dateRangeSchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid range")
  if (!clampRangeDays(parsed.data.start, parsed.data.end, 2)) return jsonError("Invalid range (too large)")

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from("morning_tasks")
    .update({ is_shared: true, shared_at: new Date().toISOString() })
    .eq("user_id", authResult.userId)
    .gte("created_at", parsed.data.start)
    .lte("created_at", parsed.data.end)
    .select("id")

  if (error) return jsonError(error.message, 500)
  return NextResponse.json({ updated: data?.length ?? 0 })
}


