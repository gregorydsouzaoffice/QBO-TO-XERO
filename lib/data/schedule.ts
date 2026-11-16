/**
 * AI QA schedule: a run every 2 hours on the even hour (00:00, 02:00 … 22:00,
 * Sydney time in production). The latest QA report is emailed after each run.
 */
import { now } from "../clock"

export const QA_INTERVAL_HOURS = 2

/** Start of the most recent run (always in the past) */
export function lastRunAt(ref: Date = now()): Date {
  const d = new Date(ref)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() - (d.getHours() % QA_INTERVAL_HOURS))
  return d
}

export function nextRunAt(ref: Date = now()): Date {
  const d = lastRunAt(ref)
  d.setHours(d.getHours() + QA_INTERVAL_HOURS)
  return d
}

/** The last `count` run times, newest first */
export function recentRuns(count = 12, ref: Date = now()): Date[] {
  const out: Date[] = []
  const d = lastRunAt(ref)
  for (let i = 0; i < count; i++) {
    out.push(new Date(d))
    d.setHours(d.getHours() - QA_INTERVAL_HOURS)
  }
  return out
}

/** "1 h 12 min" until the next run */
export function untilNextRun(ref: Date = now()): string {
  const ms = nextRunAt(ref).getTime() - ref.getTime()
  const mins = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h} h ${m} min` : `${m} min`
}

/** Short run ID, e.g. QA-20261116-1400 */
export function runId(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `QA-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}00`
}
