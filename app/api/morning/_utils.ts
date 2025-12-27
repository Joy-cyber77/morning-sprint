import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@clerk/nextjs/server"

import { createClerkSupabaseServerClient } from "@/lib/supabase/clerk-server"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function requireUserId() {
  const { userId } = await auth()
  if (!userId) return { ok: false as const, res: jsonError("Unauthorized", 401) }
  return { ok: true as const, userId }
}

export function getSupabaseServerClient() {
  return createClerkSupabaseServerClient()
}

export const isoStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO date")

export const dateRangeSchema = z.object({
  start: isoStringSchema,
  end: isoStringSchema,
})

export function clampRangeDays(startIso: string, endIso: string, maxDays: number) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const ms = end.getTime() - start.getTime()
  const days = ms / (1000 * 60 * 60 * 24)
  return Number.isFinite(days) && days <= maxDays && days >= -0.0001
}


