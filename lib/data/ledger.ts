/**
 * The demo ledger: invented but internally consistent monthly figures from the
 * QuickBooks inception (Jul 2019) to today.
 *
 *  - QBO side: seeded model per account (chart.ts).
 *  - Xero side: identical up to the conversion date (history migrated and
 *    trial balances matched), then QBO + the effects of unresolved issues.
 *
 * Internally every amount is debit-positive (assets/expenses +, income/
 * liabilities/equity −). Use `natural()` to show figures the way reports do.
 * The balance sheet always balances: bank is the plug.
 */
import { addDays, currentPeriod, daysBetween, daysInPeriod, fyOf, fyStart, INCEPTION_DATE, INCEPTION_PERIOD, periodLabelShort, periodRange } from "../clock"
import { round2, seeded } from "../format"
import { ACCOUNT_BY_CODE, CHART, CREDIT_NATURAL, isPL, POSTING_ACCOUNTS, type Account, type Section } from "./chart"
import { activeEffects } from "./issues"

export type System = "qbo" | "xero"
export type Amounts = Record<string, number>

/** Retained earnings brought into QuickBooks at inception (business existed before) */
const OPENING_RETAINED = 310_000

const SEASON = [0.8, 0.96, 1.05, 1.0, 1.02, 1.1, 0.95, 1.0, 1.03, 1.06, 1.08, 0.93] // Jan..Dec

function monthIndex(period: string): number {
  const [y, m] = period.split("-").map(Number)
  const [iy, im] = INCEPTION_PERIOD.split("-").map(Number)
  return (y - iy) * 12 + (m - im)
}

function revenueBase(period: string): number {
  const i = monthIndex(period)
  const m = Number(period.slice(5, 7))
  const rng = seeded(`rev:${period}`)
  let r = 158_000 * Math.pow(1.14, i / 12) * SEASON[m - 1] * (0.94 + rng() * 0.12)
  if (period === "2020-04" || period === "2020-05") r *= 0.8 // lockdown dip
  return r
}

// ---------------------------------------------------------------------------
// Monthly P&L activity (QBO), full month

const monthCache = new Map<string, Amounts>()

export function monthActivity(period: string): Amounts {
  const hit = monthCache.get(period)
  if (hit) return hit
  const rev = revenueBase(period)
  const years = monthIndex(period) / 12
  const out: Amounts = {}
  for (const a of POSTING_ACCOUNTS) {
    if (!isPL(a)) continue
    const rng = seeded(`${a.code}:${period}`)
    const jitter = (n = 0) => 1 + n * (rng() - 0.5) * 2
    let v = 0
    if (a.model.kind === "share") v = rev * a.model.share * jitter(a.model.noise)
    else if (a.model.kind === "fixed") {
      v = a.model.monthly * Math.pow(1 + (a.model.growth ?? 0), years) * jitter(a.model.noise)
      if (a.code === "6090" && period.endsWith("-10")) v *= 2.6 // annual accounts & tax return
    }
    v = round2(Math.max(0, v))
    out[a.code] = a.section === "income" || a.section === "other-income" ? -v : v
  }
  monthCache.set(period, out)
  return out
}

function sumInto(target: Amounts, src: Amounts, factor = 1) {
  for (const [k, v] of Object.entries(src)) target[k] = (target[k] ?? 0) + v * factor
}

function roundAll(a: Amounts): Amounts {
  for (const k of Object.keys(a)) a[k] = round2(a[k])
  return a
}

/** Debit-positive P&L per account between two dates (inclusive). Partial months are pro-rated by day. */
export function plBetween(from: string, to: string, system: System = "qbo"): Amounts {
  const out: Amounts = {}
  if (to < from) return out
  const start = from < INCEPTION_DATE ? INCEPTION_DATE : from
  for (const p of periodRange(start.slice(0, 7), to.slice(0, 7))) {
    const days = daysInPeriod(p)
    const first = p === start.slice(0, 7) ? Number(start.slice(8, 10)) : 1
    const last = p === to.slice(0, 7) ? Number(to.slice(8, 10)) : days
    const factor = (last - first + 1) / days
    if (factor > 0) sumInto(out, monthActivity(p), factor)
  }
  if (system === "xero") {
    for (const e of activeEffects()) {
      if (e.date >= start && e.date <= to && ACCOUNT_BY_CODE[e.code] && isPL(ACCOUNT_BY_CODE[e.code])) out[e.code] = (out[e.code] ?? 0) + e.amount
    }
  }
  return roundAll(out)
}

export interface PlTotals {
  income: number
  cogs: number
  grossProfit: number
  expenses: number
  otherIncome: number
  otherExpenses: number
  netProfit: number
  /** Gross margin % */
  grossMargin: number
  /** Net margin % */
  netMargin: number
}

/** Natural-sign P&L totals */
export function totalsOf(pl: Amounts): PlTotals {
  const by = (s: Section) => CHART.filter((a) => a.section === s).reduce((t, a) => t + (pl[a.code] ?? 0), 0)
  const income = -by("income")
  const cogs = by("cogs")
  const expenses = by("expense")
  const otherIncome = -by("other-income")
  const otherExpenses = by("other-expense")
  const grossProfit = income - cogs
  const netProfit = grossProfit - expenses + otherIncome - otherExpenses
  return {
    income: round2(income),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    expenses: round2(expenses),
    otherIncome: round2(otherIncome),
    otherExpenses: round2(otherExpenses),
    netProfit: round2(netProfit),
    grossMargin: income ? (grossProfit / income) * 100 : 0,
    netMargin: income ? (netProfit / income) * 100 : 0,
  }
}

export function plTotals(from: string, to: string, system: System = "qbo"): PlTotals {
  return totalsOf(plBetween(from, to, system))
}

export interface TrendPoint extends PlTotals {
  period: string
  label: string
}

/** Month-by-month P&L totals between two dates */
export function monthlyTrend(from: string, to: string, system: System = "qbo"): TrendPoint[] {
  const start = from < INCEPTION_DATE ? INCEPTION_DATE : from
  return periodRange(start.slice(0, 7), to.slice(0, 7)).map((p) => {
    const f = p === start.slice(0, 7) ? start : `${p}-01`
    const t = p === to.slice(0, 7) ? to : addDays(`${p}-01`, daysInPeriod(p) - 1)
    return { period: p, label: periodLabelShort(p), ...plTotals(f, t, system) }
  })
}

/** Net profit per financial year (QBO), used for retained earnings */
function fyNetProfit(fy: number): number {
  return plTotals(fyStart(fy), `${fy}-06-30`).netProfit
}

// ---------------------------------------------------------------------------
// Balance sheet

const fyCache = new Map<number, number>()
function fyNp(fy: number) {
  if (!fyCache.has(fy)) fyCache.set(fy, fyNetProfit(fy))
  return fyCache.get(fy)!
}

/** Dividends: December and June, each 35% of the financial-year profit to the month before */
function dividendsInFy(fy: number, through: string): number {
  let total = 0
  const dec = `${fy - 1}-12-15`
  const jun = `${fy}-06-15`
  if (through >= dec) total += Math.max(0, plTotals(fyStart(fy), `${fy - 1}-11-30`).netProfit * 0.35)
  if (through >= jun) total += Math.max(0, plTotals(fyStart(fy), `${fy}-05-31`).netProfit * 0.35)
  return round2(total)
}

function loanBalance(iso: string): number {
  // FY21 loan $180k over 60 months, FY26 loan $140k over 60 months
  const loans = [
    { start: "2020-07-01", amount: 180_000 },
    { start: "2025-07-01", amount: 140_000 },
  ]
  let bal = 0
  for (const l of loans) {
    if (iso < l.start) continue
    const months = Math.floor(daysBetween(l.start, iso) / 30.44)
    bal += Math.max(0, l.amount * (1 - months / 60))
  }
  return bal
}

const bsCache = new Map<string, Amounts>()

/** Debit-positive balances of every balance-sheet account at a date (QBO or Xero). */
export function balancesAt(iso: string, system: System = "qbo"): Amounts {
  const key = `${iso}:${system}`
  const hit = bsCache.get(key)
  if (hit) return hit

  const p = iso.slice(0, 7) > currentPeriod() ? currentPeriod() : iso.slice(0, 7)
  const m = monthActivity(p)
  const rev = -((m["4010"] ?? 0) + (m["4020"] ?? 0) + (m["4030"] ?? 0) + (m["4040"] ?? 0))
  const fy = fyOf(iso)
  const years = monthIndex(p) / 12
  const qMonth = (Number(p.slice(5, 7)) - 1) % 3 // 0,1,2 within the BAS quarter

  const b: Amounts = {}
  b["1099"] = 0
  b["1100"] = rev * 1.2
  b["1200"] = (m["5010"] ?? 0) * 0.55
  b["1210"] = 9000 * Math.pow(1.06, years)
  b["1300"] = rev * 0.1
  b["1500"] = 60_000 + 25_000 * Math.max(0, fy - 2020)
  b["1510"] = 90_000 + 45_000 * [2022, 2024, 2026].filter((y) => fy >= y).length
  const cumDep = plBetween(INCEPTION_DATE, iso)["6140"] ?? 0
  b["1501"] = -cumDep * 0.4
  b["1511"] = -cumDep * 0.6

  const purchases = (m["5010"] ?? 0) + (m["5020"] ?? 0) + (m["5040"] ?? 0)
  b["2000"] = -purchases * 0.85 * 1.1
  b["2110"] = -((m["6031"] ?? 0) + (m["6110"] ?? 0) + (m["6120"] ?? 0) + (m["6080"] ?? 0)) * 0.7
  const gstable = purchases + (m["6000"] ?? 0) + (m["6031"] ?? 0) + (m["6040"] ?? 0) + (m["6080"] ?? 0)
  b["2200"] = -Math.max(0, (rev - gstable) * 0.1) * (qMonth + 1)
  const wages = (m["6060"] ?? 0) + (m["5030"] ?? 0)
  b["2210"] = -wages * 0.19
  b["2220"] = -(m["6070"] ?? 0) * (qMonth + 1)
  b["2230"] = -wages * 0.12
  b["2300"] = -rev * 0.035
  b["2500"] = -loanBalance(iso)
  b["2510"] = -50_000

  b["3000"] = 0
  b["3100"] = -100
  let prior = OPENING_RETAINED
  for (let y = fyOf(INCEPTION_DATE); y < fy; y++) prior += fyNp(y) - dividendsInFy(y, `${y}-06-30`)
  b["3200"] = -prior
  b["3300"] = dividendsInFy(fy, iso)
  b["3900"] = -plTotals(fyStart(fy), iso).netProfit

  // Round first, then bank is the plug so the balance sheet balances to the cent
  roundAll(b)
  let others = 0
  for (const [k, v] of Object.entries(b)) if (k !== "1010" && k !== "1020") others += v
  const totalBank = -others
  const saver = Math.min(Math.max(0, totalBank - 60_000), 40_000 + 20_000 * Math.max(0, fy - 2020))
  b["1020"] = saver
  b["1010"] = totalBank - saver

  if (system === "xero") {
    for (const e of activeEffects()) {
      if (e.date > iso) continue
      const acct = ACCOUNT_BY_CODE[e.code]
      if (!acct) continue
      if (isPL(acct)) {
        // P&L effects flow through current-year earnings, or retained earnings for earlier years
        if (fyOf(e.date) === fy) b["3900"] += e.amount
        else b["3200"] += e.amount
      } else b[e.code] = (b[e.code] ?? 0) + e.amount
    }
  }

  roundAll(b)
  bsCache.set(key, b)
  return b
}

/** Show a debit-positive amount the way reports do (income, liabilities, equity as positive) */
export function natural(account: Account | string, amount: number): number {
  const a = typeof account === "string" ? ACCOUNT_BY_CODE[account] : account
  return a && CREDIT_NATURAL.includes(a.section) ? -amount : amount
}

export interface BsSection {
  section: "asset" | "liability" | "equity"
  rows: { code: string; name: string; xeroCode: string; amount: number }[]
  total: number
}

export function balanceSheet(iso: string, system: System = "qbo"): { sections: BsSection[]; netAssets: number; check: number } {
  const b = balancesAt(iso, system)
  const sections = (["asset", "liability", "equity"] as const).map((s) => {
    const rows = CHART.filter((a) => a.section === s && b[a.code] !== undefined).map((a) => ({
      code: a.code,
      name: a.name,
      xeroCode: a.xeroCode,
      amount: round2(natural(a, b[a.code])),
    }))
    return { section: s, rows, total: round2(rows.reduce((t, r) => t + r.amount, 0)) }
  })
  const [assets, liabilities, equity] = sections
  return { sections, netAssets: round2(assets.total - liabilities.total), check: round2(assets.total - liabilities.total - equity.total) }
}

export interface TbRow {
  code: string
  name: string
  xeroCode: string
  xeroName: string
  debit: number
  credit: number
}

/**
 * Trial balance at a date: balance-sheet accounts at that date plus P&L for the
 * financial year to that date. Current Year Earnings is left out (it is the
 * P&L itself), so debits equal credits.
 */
export function trialBalance(iso: string, system: System = "qbo"): TbRow[] {
  const bs = balancesAt(iso, system)
  const pl = plBetween(fyStart(fyOf(iso)), iso, system)
  const rows: TbRow[] = []
  for (const a of POSTING_ACCOUNTS) {
    if (a.code === "3900") continue
    const v = isPL(a) ? pl[a.code] ?? 0 : bs[a.code] ?? 0
    if (Math.abs(v) < 0.005) continue
    rows.push({ code: a.code, name: a.name, xeroCode: a.xeroCode, xeroName: a.xeroName, debit: v > 0 ? round2(v) : 0, credit: v < 0 ? round2(-v) : 0 })
  }
  return rows
}

/** QBO vs Xero, account by account, at a date */
export function compareTrialBalances(iso: string) {
  const q = trialBalance(iso, "qbo")
  const x = trialBalance(iso, "xero")
  const codes = Array.from(new Set([...q.map((r) => r.code), ...x.map((r) => r.code)]))
  const order = new Map(CHART.map((a, i) => [a.code, i]))
  codes.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
  return codes.map((code) => {
    const a = ACCOUNT_BY_CODE[code]
    const qr = q.find((r) => r.code === code)
    const xr = x.find((r) => r.code === code)
    const qv = qr ? qr.debit - qr.credit : 0
    const xv = xr ? xr.debit - xr.credit : 0
    return { code, name: a.name, xeroCode: a.xeroCode, xeroName: a.xeroName, qbo: round2(qv), xero: round2(xv), diff: round2(xv - qv) }
  })
}

/** Bank, card and clearing balances at a date for both systems */
export function bankBalances(iso: string) {
  const q = balancesAt(iso, "qbo")
  const x = balancesAt(iso, "xero")
  return ["1010", "1020", "2110"].map((code) => ({
    code,
    name: ACCOUNT_BY_CODE[code].name,
    xeroCode: ACCOUNT_BY_CODE[code].xeroCode,
    qbo: round2(natural(code, q[code])),
    xero: round2(natural(code, x[code])),
  }))
}
