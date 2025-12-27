"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { Home, History, LogOut, Users, CheckSquare } from "lucide-react"
import { useClerk } from "@clerk/nextjs"

export function Header() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const clerk = useClerk()

  const handleLogout = async () => {
    await clerk.signOut()
    refreshUser()
    router.push("/login")
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">MS</span>
          </div>
          <span className="font-bold text-xl">Morning Sprint</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" asChild size="sm">
            <Link href="/todos">
              <CheckSquare className="w-4 h-4 mr-2" />
              Today's Todos
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/history">
              <History className="w-4 h-4 mr-2" />
              History
            </Link>
          </Button>
          {user?.isAdmin && (
            <Button variant="ghost" asChild size="sm">
              <Link href="/admin">
                <Users className="w-4 h-4 mr-2" />
                Admin
              </Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:block text-sm text-muted-foreground">{user.name}</div>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="default" asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
