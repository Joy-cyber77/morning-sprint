import { NextResponse } from "next/server"
import { z } from "zod"
import { auth, currentUser } from "@clerk/nextjs/server"

const bodySchema = z.object({
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(5000),
})

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

async function sendViaResend(params: { from: string; to: string; subject: string; text: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("서버 설정 오류: RESEND_API_KEY가 없습니다.")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  })

  const json = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json && typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : `Resend 요청 실패 (${res.status})`
    throw new Error(message)
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return jsonError("Unauthorized", 401)

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid body")

  const supportTo = process.env.SUPPORT_EMAIL_TO ?? "ppagle77@gmail.com"
  const supportFrom = process.env.SUPPORT_EMAIL_FROM ?? "Morning Sprint <onboarding@resend.dev>"

  const u = await currentUser().catch(() => null)
  const fromEmail = u?.primaryEmailAddress?.emailAddress ?? ""
  const fromName = u?.fullName ?? u?.username ?? "사용자"

  const subject = `[Morning Sprint 문의] ${parsed.data.subject}`
  const text = [
    `fromName: ${fromName}`,
    `fromEmail: ${fromEmail || "(unknown)"}`,
    `userId: ${userId}`,
    "",
    parsed.data.message,
  ].join("\n")

  try {
    await sendViaResend({ from: supportFrom, to: supportTo, subject, text, replyTo: fromEmail || undefined })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "메일 전송 실패", 500)
  }
}


