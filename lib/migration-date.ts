// Migration date and conversion period helpers
const KEY = "mmc_migration_date"
const START_KEY = "mmc_migration_start_date"
const END_KEY = "mmc_migration_end_date"

export const DEFAULT_START_DATE = "2025-07-01" // 01.07.2025
export const DEFAULT_END_DATE = "2026-11-17"   // 17.11.2026

const pad = (n: number) => String(n).padStart(2, "0")

/** Default start date as YYYY-MM-DD */
export function defaultStartDateISO(): string {
  return DEFAULT_START_DATE
}

/** Default end date as YYYY-MM-DD */
export function defaultEndDateISO(): string {
  return DEFAULT_END_DATE
}

/** Today's date in local time as YYYY-MM-DD */
export function todayISO(): string {
  return DEFAULT_END_DATE
}

export function getMigrationStartDate(): string {
  if (typeof window === "undefined") return DEFAULT_START_DATE
  try {
    return window.sessionStorage.getItem(START_KEY) || DEFAULT_START_DATE
  } catch {
    return DEFAULT_START_DATE
  }
}

export function setMigrationStartDate(value: string) {
  try {
    window.sessionStorage.setItem(START_KEY, value)
  } catch {}
}

export function getMigrationEndDate(): string {
  if (typeof window === "undefined") return DEFAULT_END_DATE
  try {
    return window.sessionStorage.getItem(END_KEY) || window.sessionStorage.getItem(KEY) || DEFAULT_END_DATE
  } catch {
    return DEFAULT_END_DATE
  }
}

export function setMigrationEndDate(value: string) {
  try {
    window.sessionStorage.setItem(END_KEY, value)
    window.sessionStorage.setItem(KEY, value)
  } catch {}
}

export function getMigrationDate(): string {
  return getMigrationEndDate()
}

export function setMigrationDate(value: string) {
  setMigrationEndDate(value)
}

export function clearMigrationDate() {
  try {
    window.sessionStorage.removeItem(KEY)
    window.sessionStorage.removeItem(START_KEY)
    window.sessionStorage.removeItem(END_KEY)
  } catch {}
}

/** "01.07.2025" or "17.11.2026" */
export function formatDateDot(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return `${pad(d)}.${pad(m)}.${y}`
}

/** "17 November 2026" */
export function formatLong(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/** "17/11/2026" */
export function formatShort(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB")
}

/** "01.07.2025 to 17.11.2026" */
export function formatPeriod(startIso = DEFAULT_START_DATE, endIso = DEFAULT_END_DATE): string {
  return `${formatDateDot(startIso)} to ${formatDateDot(endIso)}`
}

/** "1 July 2025 to 17 November 2026" */
export function formatPeriodLong(startIso = DEFAULT_START_DATE, endIso = DEFAULT_END_DATE): string {
  return `${formatLong(startIso)} to ${formatLong(endIso)}`
}
