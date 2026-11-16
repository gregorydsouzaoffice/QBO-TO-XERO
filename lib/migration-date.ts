// Migration date helpers – always dynamic (defaults to the current day), never hardcoded.
// Stored per browser session only, so a new demo session always starts from today.
const KEY = "mmc_migration_date"

const pad = (n: number) => String(n).padStart(2, "0")

/** Today's date in the user's local timezone, as YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function getMigrationDate(): string {
  if (typeof window === "undefined") return todayISO()
  try {
    return window.sessionStorage.getItem(KEY) || todayISO()
  } catch {
    return todayISO()
  }
}

export function setMigrationDate(value: string) {
  try {
    window.sessionStorage.setItem(KEY, value)
  } catch {}
}

export function clearMigrationDate() {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {}
}

/** "17 November 2026" */
export function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/** "17/11/2026" */
export function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB")
}
