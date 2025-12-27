import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config"

/**
 * Clerk 세션 토큰을 Supabase 요청에 주입하는 "서버 전용" 클라이언트.
 *
 * - Supabase RLS 정책에서 `auth.jwt()` (sub 등) 를 사용하려면
 *   Supabase 요청이 "authenticated" role의 JWT를 가져야 합니다.
 * - Clerk의 Supabase 네이티브 통합을 활성화했다면, Clerk 세션 토큰에
 *   Supabase가 요구하는 claim(role=authenticated)이 포함됩니다.
 *
 * 참고: https://clerk.com/docs/guides/development/integrations/databases/supabase
 */
export function createClerkSupabaseServerClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    async accessToken() {
      // Clerk: 서버 환경에서 현재 요청의 세션 토큰을 가져옵니다.
      // 로그인되지 않은 경우 null이 될 수 있습니다.
      return (await auth()).getToken()
    },
    auth: {
      // 서버에서는 세션을 저장/갱신하지 않습니다.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}


