import type { Window } from '../types'

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: 'Week' }
const WIDTH = 10

export const label = (kind: string): string => LABELS[kind] ?? kind

export const left = (w: Window): number =>
  Math.max(0, Math.floor(100 - w.percentUsed))

export const bar = (w: Window): string => {
  const filled = Math.min(WIDTH, Math.max(0, Math.round((left(w) / 100) * WIDTH)))
  return '█'.repeat(filled) + '░'.repeat(WIDTH - filled)
}

export const color = (w: Window): string =>
  w.percentUsed >= 90 ? 'red' : w.percentUsed >= 70 ? 'yellow' : 'green'

/** "2h 14m", "3d 4h", "45m", or "now" once past. */
export const until = (resetsAt: string | undefined, now: number): string | null => {
  if (!resetsAt) return null
  const ms = Date.parse(resetsAt) - now
  if (Number.isNaN(ms)) return null
  if (ms <= 0) return 'now'
  const minutes = Math.ceil(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/** Five-hour first, then weekly, then anything else the API reports. */
export const ordered = (windows: readonly Window[]): Window[] => {
  const rank = (k: string) => (k === 'five_hour' ? 0 : k === 'seven_day' ? 1 : 2)
  return [...windows].sort((a, b) => rank(a.kind) - rank(b.kind))
}

export const summary = (w: Window, now: number): string => {
  const reset = until(w.resetsAt, now)
  return `${label(w.kind)} ${left(w)}% left` + (reset ? ` · resets in ${reset}` : '')
}
