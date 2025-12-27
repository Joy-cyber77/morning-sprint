"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type User } from "@/lib/mock-db"
import { useUser } from "@clerk/nextjs"
import { getClerkDisplayName, getClerkPrimaryEmail, isAdminUser } from "@/lib/clerk"
import { env } from "@/lib/env"

interface AuthContextType {
  user: User | null
  loading: boolean
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = () => {
    if (!isLoaded) return
    if (!isSignedIn || !clerkUser) {
      setUser(null)
      return
    }

    const email = getClerkPrimaryEmail(clerkUser) ?? ""
    const name = getClerkDisplayName(clerkUser)
    const isAdmin = isAdminUser({ user: clerkUser, adminEmailsCsv: env.NEXT_PUBLIC_ADMIN_EMAILS })

    setUser({
      id: clerkUser.id,
      email,
      password: "",
      name,
      createdAt: new Date(clerkUser.createdAt ?? Date.now()).toISOString(),
      isAdmin,
    })
  }

  useEffect(() => {
    refreshUser()
    setLoading(!isLoaded)
  }, [isLoaded, isSignedIn, clerkUser])

  return <AuthContext.Provider value={{ user, loading, refreshUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
