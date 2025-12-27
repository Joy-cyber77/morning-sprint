"use server"

import { auth } from "@clerk/nextjs/server"

import { createClerkSupabaseServerClient } from "@/lib/supabase/clerk-server"

export async function addTask(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return

  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }

  const supabase = createClerkSupabaseServerClient()
  const { error } = await supabase.from("tasks").insert({ name: trimmed })

  if (error) {
    // RLS/테이블/통합 설정이 안 되어 있으면 여기서 에러가 납니다.
    throw new Error(error.message)
  }
}


