"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function ContactPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()

  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  const submit = async () => {
    if (!user) return
    const s = subject.trim()
    const m = message.trim()
    if (!s || !m) return

    setSending(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: s, message: m }),
      })
      const json: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "error" in json && typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : "문의 전송에 실패했습니다."
        throw new Error(msg)
      }

      setSubject("")
      setMessage("")
      toast({ title: "문의가 접수되었습니다." })
    } catch (e) {
      toast({
        title: "전송 실패",
        description: e instanceof Error ? e.message : "문의 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !sending

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">문의하기</h1>
            <p className="text-sm text-muted-foreground">운영자에게 문의 내용을 보내면 이메일로 전달됩니다.</p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-subject">제목</Label>
              <Input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="예) 로그인 오류가 발생해요"
                maxLength={120}
              />
              <div className="text-xs text-muted-foreground text-right">{subject.trim().length}/120</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">내용</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="상황/재현 방법/원하는 해결 방법 등을 자세히 적어주세요."
                rows={8}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()} disabled={sending}>
                돌아가기
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                {sending ? "전송 중..." : "보내기"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}


