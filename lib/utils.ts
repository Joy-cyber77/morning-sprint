import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isSameLocalDay(isoDateString: string, day: Date) {
  const d = new Date(isoDateString)
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate()
}

export function formatKoreanDate(day: Date) {
  return day.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

export const KOREA_TIME_ZONE = "Asia/Seoul"

function getTimePartsInTimeZone(date: Date, timeZone: string): { hour: number; minute: number } | null {
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)

  const hour = Number(parts.find((p) => p.type === "hour")?.value)
  const minute = Number(parts.find((p) => p.type === "minute")?.value)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null

  return { hour, minute }
}

// ISO 시각을 "특정 timezone의 시:분"으로 해석했을 때, cutoff(시:분) '이후'인지 판별
// 예) cutoff=08:01 이면 08:01부터 true
export function isAfterTimeInTimeZone(
  isoDateString: string,
  timeZone: string,
  cutoff: { hour: number; minute: number },
): boolean {
  const parts = getTimePartsInTimeZone(new Date(isoDateString), timeZone)
  if (!parts) return false

  const t = parts.hour * 60 + parts.minute
  const c = cutoff.hour * 60 + cutoff.minute
  return t >= c
}

export function isLateMorningTodoCreatedAt(isoDateString: string): boolean {
  // 한국시간 기준 08:01부터 지각
  return isAfterTimeInTimeZone(isoDateString, KOREA_TIME_ZONE, { hour: 8, minute: 1 })
}
