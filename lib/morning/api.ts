import type { MorningFeedback, MorningTask, MorningTaskCategory, MorningTaskWithLikes } from "@/lib/morning/types"

type ApiErrorShape = { error: string }

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await parseJson<ApiErrorShape>(res).catch(() => null)
    const message = body?.error ?? `Request failed: ${res.status}`
    throw new Error(message)
  }

  return await parseJson<T>(res)
}

export async function apiListTodayTasks(params: { start: string; end: string }): Promise<MorningTask[]> {
  const q = new URLSearchParams({ start: params.start, end: params.end })
  return await requestJson<MorningTask[]>(`/api/morning/tasks/today?${q.toString()}`)
}

export async function apiListTasksInRange(params: { start: string; end: string }): Promise<MorningTask[]> {
  const q = new URLSearchParams({ start: params.start, end: params.end })
  return await requestJson<MorningTask[]>(`/api/morning/tasks/range?${q.toString()}`)
}

export async function apiCreateTask(params: {
  content: string
  category: MorningTaskCategory
  userName: string
}): Promise<MorningTask> {
  return await requestJson<MorningTask>("/api/morning/tasks", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function apiUpdateTask(
  id: string,
  patch: Partial<{
    content: string
    category: MorningTaskCategory
    completed: boolean
  }>,
): Promise<MorningTask> {
  return await requestJson<MorningTask>(`/api/morning/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function apiDeleteTask(id: string): Promise<{ ok: true }> {
  return await requestJson<{ ok: true }>(`/api/morning/tasks/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function apiShareTodayTasks(params: { start: string; end: string }): Promise<{ updated: number }> {
  return await requestJson<{ updated: number }>("/api/morning/tasks/share-today", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function apiListSharedTasksInRange(params: { start: string; end: string }): Promise<MorningTaskWithLikes[]> {
  const q = new URLSearchParams({ start: params.start, end: params.end })
  return await requestJson<MorningTaskWithLikes[]>(`/api/morning/dashboard/shared?${q.toString()}`)
}

export async function apiToggleTaskLike(taskId: string): Promise<{ liked: boolean; likesCount: number }> {
  return await requestJson<{ liked: boolean; likesCount: number }>(
    `/api/morning/tasks/${encodeURIComponent(taskId)}/toggle-like`,
    { method: "POST" },
  )
}

export async function apiListFeedbacks(params: {
  toUserIds: string[]
  start: string
  end: string
}): Promise<MorningFeedback[]> {
  const q = new URLSearchParams({
    start: params.start,
    end: params.end,
    toUserIds: params.toUserIds.join(","),
  })
  return await requestJson<MorningFeedback[]>(`/api/morning/feedbacks?${q.toString()}`)
}

export async function apiCreateFeedback(params: { toUserId: string; content: string; fromUserName: string }): Promise<MorningFeedback> {
  return await requestJson<MorningFeedback>("/api/morning/feedbacks", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function apiCreateFeedbackComment(params: {
  feedbackId: string
  content: string
  fromUserName: string
}): Promise<{ ok: true }> {
  return await requestJson<{ ok: true }>(`/api/morning/feedbacks/${encodeURIComponent(params.feedbackId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: params.content, fromUserName: params.fromUserName }),
  })
}


