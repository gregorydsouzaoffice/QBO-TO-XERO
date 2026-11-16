/**
 * Dynamic dates. Every date on every screen, report and export is derived
 * from "today", so the demo never goes stale. Australian financial year:
 * 1 July – 30 June, named after the year it ends (FY27 = Jul 2026 – Jun 2027).
 *
 * For a recording on a fixed date set NEXT_PUBLIC_DEMO_TODAY=YYYY-MM-DD.
 *
 * Periods are "YYYY-MM" strings, dates are ISO "YYYY-MM-DD" strings.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/** First day of the business's QuickBooks Online file (start of FY20). */
export const INCEPTION_DATE = "2019-07-01"
export const INCEPTION_PERIOD = "2019-07"

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Now", with the optional fixed-date override for recordings. */
export function now(): Date {
  const fixed = process.env.NEXT_PUBLIC_DEMO_TODAY
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) {
    const real = new Date()
    const [y, m, d] = fixed.split("-").map(Number)
    return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds())
  }
  return new Date()
}

export function todayISO(): string {
  return isoOf(now())
}

export function currentPeriod(): string {
  return todayISO().slice(0, 7)
}

// ---------------------------------------------------------------------------
// Periods

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number)
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split("-").map(Number)
  const [y2, m2, d2] = toIso.split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

export function periodRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let p = from; p <= to; p = addMonths(p, 1)) out.push(p)
  return out
}

export function lastDayOfPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return isoOf(new Date(y, m, 0))
}

export function daysInPeriod(period: string): number {
  return Number(lastDayOfPeriod(period).slice(8, 10))
}

/** Last fully closed month (the month before today). */
export function lastClosedPeriod(): string {
  return addMonths(currentPeriod(), -1)
}

export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function periodLabelShort(period: string): string {
  const [y, m] = period.split("-").map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

// ---------------------------------------------------------------------------
// Financial years

/** Financial year number a date or period falls in: Nov 2026 → 2027 */
export function fyOf(isoOrPeriod: string): number {
  const [y, m] = isoOrPeriod.split("-").map(Number)
  return m >= 7 ? y + 1 : y
}

export function fyStart(fy: number): string {
  return `${fy - 1}-07-01`
}

export function fyEnd(fy: number): string {
  return `${fy}-06-30`
}

export function fyLabel(fy: number): string {
  return `FY${String(fy).slice(2)}`
}

export function currentFy(): number {
  return fyOf(todayISO())
}

// ---------------------------------------------------------------------------
// Reporting views

export type ViewKey = "ytd" | "prior-fy" | "inception" | "custom"

export interface DateRange {
  key: ViewKey
  /** "Current YTD" */
  label: string
  /** "FY27 YTD" */
  short: string
  from: string
  to: string
  /** Comparison window used for variance columns (same span, one year earlier), null for Since Inception */
  compare: { label: string; from: string; to: string } | null
}

/** Current financial year to date: 1 July → today. Compared with the same days last year. */
export function currentYtd(): DateRange {
  const fy = currentFy()
  const to = todayISO()
  const lastYearTo = `${Number(to.slice(0, 4)) - 1}${to.slice(4)}`
  return {
    key: "ytd",
    label: "Current YTD",
    short: `${fyLabel(fy)} YTD`,
    from: fyStart(fy),
    to,
    compare: { label: `${fyLabel(fy - 1)} same period`, from: fyStart(fy - 1), to: lastYearTo === `${fy - 2}-02-29` ? `${fy - 2}-02-28` : lastYearTo },
  }
}

/** Previous full financial year, compared with the year before it. */
export function priorFy(): DateRange {
  const fy = currentFy() - 1
  return {
    key: "prior-fy",
    label: "Previous FY",
    short: fyLabel(fy),
    from: fyStart(fy),
    to: fyEnd(fy),
    compare: { label: fyLabel(fy - 1), from: fyStart(fy - 1), to: fyEnd(fy - 1) },
  }
}

/** Everything since the QuickBooks file was opened. */
export function sinceInception(): DateRange {
  return {
    key: "inception",
    label: "Since Inception",
    short: `Since ${periodLabel(INCEPTION_PERIOD)}`,
    from: INCEPTION_DATE,
    to: todayISO(),
    compare: null,
  }
}

export function customRange(from: string, to: string): DateRange {
  const span = daysBetween(from, to)
  const cFrom = `${Number(from.slice(0, 4)) - 1}${from.slice(4)}`
  return {
    key: "custom",
    label: "Custom",
    short: `${formatShort(from)} – ${formatShort(to)}`,
    from,
    to,
    compare: { label: "Same period last year", from: cFrom, to: addDays(cFrom, span) },
  }
}

export function rangeFor(key: ViewKey, custom?: { from: string; to: string }): DateRange {
  if (key === "prior-fy") return priorFy()
  if (key === "inception") return sinceInception()
  if (key === "custom" && custom) return customRange(custom.from, custom.to)
  return currentYtd()
}

/** Financial years from inception to the current one: [2020, 2021, …, 2027] */
export function fyList(): number[] {
  const out: number[] = []
  for (let fy = fyOf(INCEPTION_DATE); fy <= currentFy(); fy++) out.push(fy)
  return out
}

// ---------------------------------------------------------------------------
// Migration timeline (relative to today)

/**
 * Xero go-live (conversion) date: the first day of last month. History up to
 * the day before is migrated; since then QBO and Xero run in parallel.
 */
export function conversionDate(): string {
  return `${lastClosedPeriod()}-01`
}

/** Last day of migrated history = day before the conversion date */
export function migratedThrough(): string {
  return addDays(conversionDate(), -1)
}

export function parallelRunDay(): number {
  return daysBetween(conversionDate(), todayISO()) + 1
}

// ---------------------------------------------------------------------------
// Formatting

/** 16/11/2026 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

/** 16 Nov 2026 */
export function formatShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** 16 November 2026 */
export function formatLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`
}

/** 2:00 pm */
export function formatTime(d: Date): string {
  let h = d.getHours()
  const ampm = h >= 12 ? "pm" : "am"
  h = h % 12 || 12
  return `${h}:${pad(d.getMinutes())} ${ampm}`
}

export function formatDateTime(d: Date): string {
  return `${formatShort(isoOf(d))}, ${formatTime(d)}`
}
