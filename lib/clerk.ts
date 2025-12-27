/**
 * Clerk SDK가 환경(클라이언트/서버)과 버전에 따라 유저 타입을 다르게 노출합니다.
 * - Client: `@clerk/types`의 `UserResource`
 * - Server: `@clerk/backend` 계열의 `User` 등
 *
 * 여기서는 "우리가 실제로 쓰는 필드"만을 최소 형태로 정의해 타입 충돌을 피합니다.
 */
type ClerkUserLike = {
  fullName?: string | null
  username?: string | null
  primaryEmailAddress?: { emailAddress?: string | null } | null
  publicMetadata?: Record<string, unknown> | null
}

export function getClerkDisplayName(user: ClerkUserLike | null | undefined): string {
  return user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "사용자"
}

export function getClerkPrimaryEmail(user: ClerkUserLike | null | undefined): string | null {
  return user?.primaryEmailAddress?.emailAddress ?? null
}

export function isAdminUser(params: { user: ClerkUserLike | null | undefined; adminEmailsCsv?: string }): boolean {
  const { user, adminEmailsCsv } = params

  // Preferred: controlled through Clerk metadata (set in Clerk dashboard)
  if (user?.publicMetadata && user.publicMetadata["isAdmin"] === true) return true

  // Optional fallback: allow-list by email
  const email = getClerkPrimaryEmail(user)
  if (!email) return false
  const allow = (adminEmailsCsv ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return allow.includes(email.toLowerCase())
}


