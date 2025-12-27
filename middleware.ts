import { clerkMiddleware } from "@clerk/nextjs/server"

/**
 * Clerk 권장 방식: middleware에서 Clerk 컨텍스트를 초기화합니다.
 *
 * - 여기서는 "강제 보호"를 걸지 않습니다(기존 라우팅 동작 영향 최소화).
 * - 필요한 페이지(예: /supabase/tasks)는 서버 컴포넌트에서 `auth()`로 직접 보호합니다.
 */
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}


