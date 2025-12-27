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

  // Include tasks created within range OR completed within range
  const orFilter = [
    `and(created_at.gte.${parsed.data.start},created_at.lte.${parsed.data.end})`,
    `and(completed_at.gte.${parsed.data.start},completed_at.lte.${parsed.data.end})`,
  ].join(",")

  const { data, error } = await supabase
    .from("morning_tasks")
    .select("*")
    .eq("user_id", authResult.userId)
    .or(orFilter)
    .order("created_at", { ascending: false })

  if (error) return jsonError(error.message, 500)
  return NextResponse.json((data ?? []).map(mapTaskRow))
}


