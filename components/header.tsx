"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import { CheckSquare, Home, History, LogOut, Mail, Users } from "lucide-react"
import { SignInButton, SignUpButton, useClerk } from "@clerk/nextjs"
import { useRef, useState } from "react"

export function Header() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const clerk = useClerk()
  const logoutInFlightRef = useRef(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleLogout = async () => {
    // Prevent double-click from triggering sign-out twice and accidentally clicking the next rendered "로그인" button.
    if (logoutInFlightRef.current) return
    logoutInFlightRef.current = true
    setIsSigningOut(true)

    try {
      await clerk.signOut()
      refreshUser()
      router.replace("/dashboard")
    } finally {
      setIsSigningOut(false)
      logoutInFlightRef.current = false
    }
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">GYFL</span>
          </div>
          <span className="font-bold text-xl">GYFL 유학반</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" asChild size="sm">
            <Link href="/todos">
              <CheckSquare className="w-4 h-4 mr-2" />
              오늘의 학습
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              대시보드
            </Link>
          </Button>
          <Button variant="ghost" asChild size="sm">
            <Link href="/history">
              <History className="w-4 h-4 mr-2" />
              학습 이력
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
          <Button variant="ghost" asChild size="sm">
            <Link href="/contact" aria-label="문의하기">
              <Mail className="w-4 h-4 mr-2" />
              문의하기
            </Link>
          </Button>

          {user ? (
            <>
              <div className="hidden sm:block text-sm text-muted-foreground">{user.name}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                aria-label="로그아웃"
                disabled={isSigningOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isSigningOut ? "로그아웃 중..." : "로그아웃"}
              </Button>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="default" size="sm">
                  회원가입
                </Button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
