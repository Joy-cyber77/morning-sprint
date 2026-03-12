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

/** 입력(생성) 시각을 한국어 시간 문자열로 (예: 오전 9:30, 오후 2:05) */
export function formatCreatedTime(isoDateString: string): string {
  const d = new Date(isoDateString)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
