"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getUsers, getPosts, setPosts, setUsers, type User, type Post } from "@/lib/mock-db"
import { Users, Activity, Trash2, Shield } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type AdminStreakRow = {
  userId: string
  name: string
  email: string | null
  streak: number
}

export default function AdminPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [users, setUsersState] = useState<User[]>([])
  const [posts, setPostsState] = useState<Post[]>([])
  const [streakRows, setStreakRows] = useState<AdminStreakRow[]>([])
  const [streakError, setStreakError] = useState<string | null>(null)
  const [isStreakLoading, setIsStreakLoading] = useState(false)
  const streakDays = 14

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user && !user.isAdmin) {
      router.push("/dashboard")
    } else if (user?.isAdmin) {
      loadData()
    }
  }, [user, loading, router])

  const loadAllUserStreaks = async () => {
    setIsStreakLoading(true)
    setStreakError(null)
    try {
      const res = await fetch(`/api/admin/streaks?days=${streakDays}`)
      const body = (await res.json().catch(() => null)) as any
      if (!res.ok) {
        throw new Error(body?.error ?? `Request failed: ${res.status}`)
      }
      setStreakRows((body?.rows ?? []) as AdminStreakRow[])
    } catch (e) {
      setStreakRows([])
      setStreakError(e instanceof Error ? e.message : "streak 데이터를 불러오지 못했습니다.")
    } finally {
      setIsStreakLoading(false)
    }
  }

  const loadData = () => {
    setUsersState(getUsers())
    setPostsState(getPosts())
    void loadAllUserStreaks()
  }

  const handleDeletePost = (postId: string) => {
    const filteredPosts = getPosts().filter((p) => p.id !== postId)
    setPosts(filteredPosts)
    loadData()
  }

  const handleDeleteUser = (userId: string) => {
    if (userId === user?.id) {
      alert("You cannot delete your own account")
      return
    }

    const filteredUsers = getUsers().filter((u) => u.id !== userId)
    const filteredPosts = getPosts().filter((p) => p.userId !== userId)

    setUsers(filteredUsers)
    setPosts(filteredPosts)
    loadData()
  }

  if (loading || !user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage users and content</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Total Users</span>
              </div>
              <div className="text-3xl font-bold">{users.length}</div>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Total Posts</span>
              </div>
              <div className="text-3xl font-bold">{posts.length}</div>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">Your User ID</span>
              </div>
              <div className="text-sm font-mono break-all">{user.id}</div>
              <div className="text-xs text-muted-foreground">현재 로그인한 관리자 계정</div>
            </Card>

            <Card className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">Your Streak</span>
              </div>
              <div className="text-3xl font-bold">
                {streakRows.find((r) => r.userId === user.id)?.streak ?? "-"}
              </div>
              <div className="text-xs text-muted-foreground">오늘의 Todos 전부 완료 기준 (최근 {streakDays}일)</div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">All Users Streak</h2>
                <p className="text-sm text-muted-foreground mt-1">streak 높은 순으로 정렬 (최근 {streakDays}일)</p>
              </div>
              <Button variant="outline" onClick={loadAllUserStreaks} disabled={isStreakLoading}>
                {isStreakLoading ? "로딩 중..." : "새로고침"}
              </Button>
            </div>

            {streakError ? (
              <div className="text-sm text-destructive">{streakError}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[72px]">Rank</TableHead>
                    <TableHead className="w-[100px]">Streak</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {streakRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        {isStreakLoading ? "불러오는 중..." : "표시할 유저가 없습니다."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    streakRows.map((r, idx) => (
                      <TableRow key={r.userId}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{r.streak}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{r.name}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">{r.email ?? "-"}</TableCell>
                        <TableCell className="font-mono max-w-[360px] truncate">{r.userId}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      {u.isAdmin && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Admin</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{u.email}</div>
                    <div className="text-xs text-muted-foreground font-mono">ID: {u.id}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {u.id !== user.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
            <div className="space-y-2">
              {posts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No posts yet</div>
              ) : (
                posts.slice(0, 10).map((post) => (
                  <div
                    key={post.id}
                    className="flex items-start justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{post.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{post.content}</p>
                      <div className="text-xs text-muted-foreground">
                        Category: {post.category} • {post.likes.length} likes
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
