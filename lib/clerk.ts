import type { UserResource } from "@clerk/types"

export function getClerkDisplayName(user: UserResource | null | undefined): string {
  return user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "사용자"
}

export function getClerkPrimaryEmail(user: UserResource | null | undefined): string | null {
  return user?.primaryEmailAddress?.emailAddress ?? null
}

export function isAdminUser(params: { user: UserResource | null | undefined; adminEmailsCsv?: string }): boolean {
  const { user, adminEmailsCsv } = params

  // Preferred: controlled through Clerk metadata (set in Clerk dashboard)
  if (user?.publicMetadata && (user.publicMetadata as Record<string, unknown>)["isAdmin"] === true) return true

  // Optional fallback: allow-list by email (client-visible; use only for convenience)
  const email = getClerkPrimaryEmail(user)
  if (!email) return false
  const allow = (adminEmailsCsv ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  return allow.includes(email.toLowerCase())
}


