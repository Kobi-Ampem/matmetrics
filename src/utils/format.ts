const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function formatDate(iso: string): string {
  const date = parseISODate(iso)
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export function formatMonthYear(iso: string): string {
  const date = parseISODate(iso)
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function pad2(n: number): string {
  return String(Math.floor(Math.abs(n))).padStart(2, "0")
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`
  return `${pad2(m)}:${pad2(sec)}`
}

export function sessionClock(start: string, minute: number): string {
  const [hh, mm] = start.split(":").map(Number)
  const total = (hh ?? 0) * 3600 + (mm ?? 0) * 60 + Math.round(minute * 60)
  const h = Math.floor(total / 3600) % 24
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

export function formatVideoTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
