/**
 * Financial reports (P&L, balance sheet, KPIs, monthly trend, financial-year
 * summary) for the global reporting view, from one of three sources:
 *   xero    – Xero ledger (default)
 *   qbo     – QuickBooks Online ledger
 *   compare – QuickBooks and Xero side by side, with the difference
 *
 * The screens render the statement objects below, and the same objects are
 * turned into `Report`s for the PDF / Excel exports, so they always agree.
 * History before the conversion date is identical in both systems.
 */
import {
  addDays,
  conversionDate,
  currentFy,
  fyEnd,
  fyLabel,
  fyList,
  fyStart,
  formatShort,
  todayISO,
  type DateRange,
} from "../clock"
import { COMPANY } from "../data/company"
import { CHART, POSTING_ACCOUNTS, SECTION_LABEL, type Section } from "../data/chart"
import { balanceSheet, balancesAt, monthlyTrend, natural, plBetween, totalsOf, type Amounts, type PlTotals, type System } from "../data/ledger"
import { round2 } from "../format"
import type { Cell, Column, Report, ReportCtx, Table } from "./types"

export type Source = System | "compare"

export const SOURCE_LABEL: Record<Source, string> = { xero: "Xero", qbo: "QuickBooks Online", compare: "QuickBooks Online vs Xero" }

/** How a variance should read: an increase is good, bad, or neither */
export type Polarity = "up-good" | "up-bad" | "neutral"

export interface StatementRow {
  kind: "heading" | "account" | "subtotal" | "total"
  label: string
  code?: string
  xeroCode?: string
  xeroName?: string
  section?: Section
  /** Current period, or QuickBooks in compare mode */
  a: number
  /** Comparison period, or Xero in compare mode; null when there is no comparison */
  b: number | null
  /** period mode: a − b · system mode: b − a (Xero minus QuickBooks) */
  diff: number | null
  /** period mode: % change vs comparison · system mode: null */
  pct: number | null
  polarity: Polarity
}

export interface Statement {
  title: string
  /** period = current vs comparison window; system = QuickBooks vs Xero */
  mode: "period" | "system"
  aLabel: string
  bLabel: string | null
  diffLabel: string
  /** Revenue for "% of revenue" when there's no comparison */
  revenue: number
  rows: StatementRow[]
}

function pct(a: number, b: number): number | null {
  if (!b) return null
  return ((a - b) / Math.abs(b)) * 100
}

function makeRow(r: Omit<StatementRow, "diff" | "pct">, mode: Statement["mode"]): StatementRow {
  if (r.kind === "heading" || r.b === null) return { ...r, diff: null, pct: null }
  if (mode === "system") return { ...r, diff: round2(r.b - r.a), pct: null }
  return { ...r, diff: round2(r.a - r.b), pct: pct(r.a, r.b) }
}

export function systemsFor(source: Source): { a: System; b: System | null } {
  return source === "compare" ? { a: "qbo", b: "xero" } : { a: source, b: null }
}

/** Label of the window a range is compared with (null for Since Inception) */
export function compareLabel(range: DateRange): string | null {
  return range.compare?.label ?? null
}

// ---------------------------------------------------------------------------
// Profit and loss

const PL_GROUPS: { section: Section; total: string; polarity: Polarity }[] = [
  { section: "income", total: "Total trading income", polarity: "up-good" },
  { section: "cogs", total: "Total cost of sales", polarity: "up-bad" },
  { section: "expense", total: "Total operating expenses", polarity: "up-bad" },
  { section: "other-income", total: "Total other income", polarity: "up-good" },
  { section: "other-expense", total: "Total other expenses", polarity: "up-bad" },
]

const TOTAL_KEY: Record<string, keyof PlTotals> = { income: "income", cogs: "cogs", expense: "expenses", "other-income": "otherIncome", "other-expense": "otherExpenses" }

export function plStatement(range: DateRange, source: Source): Statement {
  const mode: Statement["mode"] = source === "compare" ? "system" : "period"
  let aPl: Amounts
  let bPl: Amounts | null
  if (source === "compare") {
    aPl = plBetween(range.from, range.to, "qbo")
    bPl = plBetween(range.from, range.to, "xero")
  } else {
    aPl = plBetween(range.from, range.to, source)
    bPl = range.compare ? plBetween(range.compare.from, range.compare.to, source) : null
  }
  const aT = totalsOf(aPl)
  const bT = bPl ? totalsOf(bPl) : null
  const rows: StatementRow[] = []
  const push = (r: Omit<StatementRow, "diff" | "pct">) => rows.push(makeRow(r, mode))

  for (const g of PL_GROUPS) {
    const accounts = POSTING_ACCOUNTS.filter((a) => a.section === g.section && (aPl[a.code] || (bPl && bPl[a.code])))
    if (!accounts.length) continue
    push({ kind: "heading", label: SECTION_LABEL[g.section], section: g.section, a: 0, b: null, polarity: "neutral" })
    for (const acc of accounts) {
      push({
        kind: "account",
        label: acc.name,
        code: acc.code,
        xeroCode: acc.xeroCode,
        xeroName: acc.xeroName,
        section: g.section,
        a: round2(natural(acc, aPl[acc.code] ?? 0)),
        b: bPl ? round2(natural(acc, bPl[acc.code] ?? 0)) : null,
        polarity: g.polarity,
      })
    }
    const k = TOTAL_KEY[g.section]
    push({ kind: "subtotal", label: g.total, section: g.section, a: aT[k], b: bT ? bT[k] : null, polarity: g.polarity })
    if (g.section === "cogs") push({ kind: "total", label: "Gross profit", a: aT.grossProfit, b: bT ? bT.grossProfit : null, polarity: "up-good" })
  }
  push({ kind: "total", label: "Net profit", a: aT.netProfit, b: bT ? bT.netProfit : null, polarity: "up-good" })

  return {
    title: "Profit and loss",
    mode,
    aLabel: mode === "system" ? "QuickBooks" : range.short,
    bLabel: mode === "system" ? "Xero" : range.compare?.label ?? null,
    diffLabel: mode === "system" ? "Difference" : "Variance",
    revenue: aT.income,
    rows,
  }
}

// ---------------------------------------------------------------------------
// Balance sheet

/** Date the balance sheet is compared with: end of the comparison window, or the last financial year end */
export function bsCompareDate(range: DateRange): string {
  if (range.compare) return range.compare.to
  const lastFyEnd = fyEnd(currentFy() - 1)
  return lastFyEnd < range.to ? lastFyEnd : addDays(range.to, -365)
}

export function bsStatement(range: DateRange, source: Source): Statement {
  const mode: Statement["mode"] = source === "compare" ? "system" : "period"
  const cmpDate = bsCompareDate(range)
  const a = balanceSheet(range.to, source === "compare" ? "qbo" : source)
  const b = source === "compare" ? balanceSheet(range.to, "xero") : balanceSheet(cmpDate, source)
  const rows: StatementRow[] = []
  const push = (r: Omit<StatementRow, "diff" | "pct">) => rows.push(makeRow(r, mode))
  const titles = { asset: ["Assets", "Total assets"], liability: ["Liabilities", "Total liabilities"], equity: ["Equity", "Total equity"] } as const

  a.sections.forEach((sec, i) => {
    const other = b.sections[i]
    const codes = sec.rows.map((r) => r.code)
    for (const r of other.rows) if (!codes.includes(r.code)) codes.push(r.code)
    push({ kind: "heading", label: titles[sec.section][0], section: sec.section, a: 0, b: null, polarity: "neutral" })
    for (const code of codes) {
      const ra = sec.rows.find((r) => r.code === code)
      const rb = other.rows.find((r) => r.code === code)
      if (!(ra?.amount || rb?.amount)) continue
      const acc = CHART.find((c) => c.code === code)!
      push({ kind: "account", label: acc.name, code, xeroCode: acc.xeroCode, xeroName: acc.xeroName, section: sec.section, a: ra?.amount ?? 0, b: rb?.amount ?? 0, polarity: "neutral" })
    }
    push({ kind: "subtotal", label: titles[sec.section][1], section: sec.section, a: sec.total, b: other.total, polarity: "neutral" })
    if (sec.section === "liability") push({ kind: "total", label: "Net assets", a: a.netAssets, b: b.netAssets, polarity: "up-good" })
  })

  return {
    title: "Balance sheet",
    mode,
    aLabel: mode === "system" ? "QuickBooks" : `At ${formatShort(range.to)}`,
    bLabel: mode === "system" ? "Xero" : `At ${formatShort(cmpDate)}`,
    diffLabel: mode === "system" ? "Difference" : "Movement",
    revenue: 0,
    rows,
  }
}

// ---------------------------------------------------------------------------
// KPIs

export interface Kpis extends PlTotals {
  cash: number
  ar: number
  ap: number
}

export function kpis(from: string, to: string, system: System): Kpis {
  const t = totalsOf(plBetween(from, to, system))
  const b = balancesAt(to, system)
  return {
    ...t,
    cash: round2((b["1010"] ?? 0) + (b["1020"] ?? 0)),
    ar: round2(b["1100"] ?? 0),
    ap: round2(-(b["2000"] ?? 0)),
  }
}

export interface KpiDef {
  key: keyof Kpis
  label: string
  polarity: Polarity
  /** Balance at a date (vs flow over the period) */
  balance?: boolean
}

export const KPI_DEFS: KpiDef[] = [
  { key: "income", label: "Revenue", polarity: "up-good" },
  { key: "grossProfit", label: "Gross profit", polarity: "up-good" },
  { key: "netProfit", label: "Net profit", polarity: "up-good" },
  { key: "cash", label: "Cash in bank", polarity: "up-good", balance: true },
  { key: "ar", label: "Owed by customers (AR)", polarity: "up-bad", balance: true },
  { key: "ap", label: "Owed to suppliers (AP)", polarity: "neutral", balance: true },
]

// ---------------------------------------------------------------------------
// Financial years and growth

export interface FyRow {
  fy: number
  label: string
  ytd: boolean
  from: string
  to: string
  totals: PlTotals
  /** Same totals from the other system (compare mode) */
  other: PlTotals | null
  /** Revenue growth vs the previous FY (YTD: vs the same period last year) */
  growth: number | null
}

export function fySummary(source: Source): FyRow[] {
  const today = todayISO()
  const sys: System = source === "compare" ? "qbo" : source
  return fyList().map((fy) => {
    const ytd = fyEnd(fy) > today
    const to = ytd ? today : fyEnd(fy)
    const totals = totalsOf(plBetween(fyStart(fy), to, sys))
    const other = source === "compare" ? totalsOf(plBetween(fyStart(fy), to, "xero")) : null
    let growth: number | null = null
    if (fy > fyList()[0]) {
      const prevTo = ytd ? `${Number(to.slice(0, 4)) - 1}${to.slice(4)}`.replace(/-02-29$/, "-02-28") : fyEnd(fy - 1)
      const prev = totalsOf(plBetween(fyStart(fy - 1), prevTo, sys))
      growth = pct(totals.income, prev.income)
    }
    return { fy, label: ytd ? `${fyLabel(fy)} YTD` : fyLabel(fy), ytd, from: fyStart(fy), to, totals, other, growth }
  })
}

/** Compound annual revenue growth over the full financial years */
export function revenueCagr(rows: FyRow[]): { rate: number; from: string; to: string } | null {
  const full = rows.filter((r) => !r.ytd)
  if (full.length < 2) return null
  const first = full[0]
  const last = full[full.length - 1]
  const years = last.fy - first.fy
  if (first.totals.income <= 0) return null
  return { rate: (Math.pow(last.totals.income / first.totals.income, 1 / years) - 1) * 100, from: first.label, to: last.label }
}

// ---------------------------------------------------------------------------
// Monthly trend

export type TrendMetric = "income" | "grossProfit" | "netProfit"
export const TREND_METRIC_LABEL: Record<TrendMetric, string> = { income: "Revenue", grossProfit: "Gross profit", netProfit: "Net profit" }

export interface TrendRow {
  period: string
  label: string
  a: PlTotals
  /** Comparison month (period mode) or Xero (system mode) */
  b: PlTotals | null
}

export function trendRows(range: DateRange, source: Source): TrendRow[] {
  if (source === "compare") {
    const q = monthlyTrend(range.from, range.to, "qbo")
    const x = monthlyTrend(range.from, range.to, "xero")
    return q.map((m, i) => ({ period: m.period, label: m.label, a: m, b: x[i] ?? null }))
  }
  const cur = monthlyTrend(range.from, range.to, source)
  const prior = range.compare ? monthlyTrend(range.compare.from, range.compare.to, source) : []
  return cur.map((m, i) => ({ period: m.period, label: m.label, a: m, b: prior[i] ?? null }))
}

// ---------------------------------------------------------------------------
// Report objects for export

const money = (key: string, label: string): Column => ({ key, label, kind: "money" })
const pctCol = (key: string, label: string): Column => ({ key, label, kind: "pct" })

export function reportCtx(range: DateRange, source: Source): ReportCtx {
  return {
    company: COMPANY.name,
    period: `${formatShort(range.from)} – ${formatShort(range.to)}`,
    scope: SOURCE_LABEL[source],
    reference: `FR-${range.key.toUpperCase()}-${todayISO().replace(/-/g, "")}`,
    generatedAt: new Date().toISOString(),
  }
}

function statementTable(st: Statement): Table {
  const cols: Column[] = [
    { key: "qbo", label: "QBO code" },
    { key: "xero", label: "Xero code" },
    { key: "account", label: "Account" },
    money("a", st.aLabel),
  ]
  if (st.bLabel) {
    cols.push(money("b", st.bLabel), money("diff", st.diffLabel))
    if (st.mode === "period") cols.push(pctCol("pct", `${st.diffLabel} %`))
  } else if (st.revenue) cols.push(pctCol("share", "% of revenue"))
  const rows = st.rows.map((r) => {
    const out: Record<string, string | number> = {
      qbo: r.code ?? "",
      xero: r.xeroCode ?? "",
      account: r.kind === "heading" ? r.label.toUpperCase() : r.label,
    }
    if (r.kind === "heading") return out
    out.a = r.a
    if (st.bLabel) {
      out.b = r.b ?? ""
      out.diff = r.diff ?? ""
      if (st.mode === "period") out.pct = r.pct === null ? "" : round2(r.pct)
    } else if (st.revenue) out.share = round2((r.a / st.revenue) * 100)
    return out
  })
  return { title: st.title, columns: cols, rows }
}

function systemNote(range: DateRange, source: Source): string[] {
  const conv = conversionDate()
  const notes = [`Source: ${SOURCE_LABEL[source]}. QBO and Xero account codes are shown so every line traces back to both ledgers.`]
  if (source === "compare" || range.to >= conv) notes.push(`History before ${formatShort(conv)} (the conversion date) was migrated and is identical in QuickBooks and Xero. Differences after it are explained in the Tracker.`)
  return notes
}

export function plReport(range: DateRange, source: Source): Report {
  const st = plStatement(range, source)
  const np = st.rows[st.rows.length - 1]
  return {
    id: "FR-02",
    title: "Profit and loss",
    subtitle: range.label,
    summary: [
      { label: "Revenue", value: `$${st.revenue.toLocaleString("en-AU", { maximumFractionDigits: 0 })}` },
      { label: st.mode === "system" ? "Net profit (QuickBooks)" : "Net profit", value: `$${np.a.toLocaleString("en-AU", { maximumFractionDigits: 0 })}` },
      ...(np.b !== null ? [{ label: st.mode === "system" ? "Net profit (Xero)" : `Net profit, ${st.bLabel}`, value: `$${np.b.toLocaleString("en-AU", { maximumFractionDigits: 0 })}` }] : []),
    ],
    tables: [statementTable(st)],
    notes: systemNote(range, source),
  }
}

export function bsReport(range: DateRange, source: Source): Report {
  const st = bsStatement(range, source)
  return { id: "FR-03", title: "Balance sheet", subtitle: `${st.aLabel}${st.bLabel ? ` vs ${st.bLabel}` : ""}`, tables: [statementTable(st)], notes: systemNote(range, source) }
}

export function kpiReport(range: DateRange, source: Source): Report {
  const { a, b } = systemsFor(source)
  const cur = kpis(range.from, range.to, a)
  const other = b ? kpis(range.from, range.to, b) : range.compare ? kpis(range.compare.from, range.compare.to, a) : null
  const bLabel = b ? "Xero" : range.compare?.label
  const columns: Column[] = [{ key: "measure", label: "Measure" }, money("a", b ? "QuickBooks" : range.short)]
  if (other) columns.push(money("b", bLabel!), money("diff", b ? "Difference" : "Variance"))
  if (other && !b) columns.push(pctCol("pct", "Variance %"))
  const rows = KPI_DEFS.map((d) => {
    const r: Record<string, string | number> = { measure: d.label, a: cur[d.key] }
    if (other) {
      r.b = other[d.key]
      r.diff = round2(b ? other[d.key] - cur[d.key] : cur[d.key] - other[d.key])
      if (!b) r.pct = pct(cur[d.key], other[d.key]) === null ? "" : round2(pct(cur[d.key], other[d.key])!)
    }
    return r
  })
  const marginCols: Column[] = [{ key: "measure", label: "Margin" }, pctCol("a", b ? "QuickBooks" : range.short), ...(other ? [pctCol("b", bLabel!), pctCol("diff", "Change (points)")] : [])]
  const margins = (["grossMargin", "netMargin"] as const).map((k) => ({
    measure: k === "grossMargin" ? "Gross margin" : "Net margin",
    a: round2(cur[k]),
    ...(other ? { b: round2(other[k]), diff: round2(b ? other[k] - cur[k] : cur[k] - other[k]) } : {}),
  }))
  return {
    id: "FR-01",
    title: "Key figures",
    subtitle: range.label,
    summary: [
      { label: "Revenue", value: `$${Math.round(cur.income).toLocaleString("en-AU")}` },
      { label: "Gross margin", value: `${cur.grossMargin.toFixed(1)}%` },
      { label: "Net profit", value: `$${Math.round(cur.netProfit).toLocaleString("en-AU")}` },
      { label: "Net margin", value: `${cur.netMargin.toFixed(1)}%` },
      { label: "Cash in bank", value: `$${Math.round(cur.cash).toLocaleString("en-AU")}` },
    ],
    tables: [
      { title: "Key figures", columns, rows },
      { title: "Margins", columns: marginCols, rows: margins },
    ],
    notes: systemNote(range, source),
  }
}

export function trendReport(range: DateRange, source: Source): Report {
  const rows = trendRows(range, source)
  const system = source === "compare"
  const columns: Column[] = system
    ? [{ key: "month", label: "Month" }, money("qi", "Revenue (QuickBooks)"), money("xi", "Revenue (Xero)"), money("qn", "Net profit (QuickBooks)"), money("xn", "Net profit (Xero)"), money("d", "Net profit difference")]
    : [{ key: "month", label: "Month" }, money("i", "Revenue"), money("g", "Gross profit"), money("n", "Net profit"), pctCol("m", "Net margin %"), ...(range.compare ? [money("pi", `Revenue, ${range.compare.label}`)] : [])]
  const body = rows.map((r): Record<string, Cell> =>
    system
      ? { month: r.label, qi: r.a.income, xi: r.b?.income ?? "", qn: r.a.netProfit, xn: r.b?.netProfit ?? "", d: r.b ? round2(r.b.netProfit - r.a.netProfit) : "" }
      : { month: r.label, i: r.a.income, g: r.a.grossProfit, n: r.a.netProfit, m: round2(r.a.netMargin), ...(range.compare ? { pi: r.b?.income ?? "" } : {}) },
  )
  return { id: "FR-04", title: "Monthly trend", subtitle: range.label, tables: [{ title: "Month by month", columns, rows: body }], notes: systemNote(range, source) }
}

export function fyReport(source: Source): Report {
  const rows = fySummary(source)
  const cagr = revenueCagr(rows)
  const system = source === "compare"
  const columns: Column[] = system
    ? [{ key: "fy", label: "Financial year" }, money("qi", "Revenue (QuickBooks)"), money("xi", "Revenue (Xero)"), money("qn", "Net profit (QuickBooks)"), money("xn", "Net profit (Xero)"), money("d", "Net profit difference")]
    : [{ key: "fy", label: "Financial year" }, money("i", "Revenue"), money("g", "Gross profit"), pctCol("gm", "Gross margin %"), money("n", "Net profit"), pctCol("nm", "Net margin %"), pctCol("gr", "Revenue growth %")]
  const body = rows.map((r): Record<string, Cell> =>
    system
      ? { fy: r.label, qi: r.totals.income, xi: r.other!.income, qn: r.totals.netProfit, xn: r.other!.netProfit, d: round2(r.other!.netProfit - r.totals.netProfit) }
      : { fy: r.label, i: r.totals.income, g: r.totals.grossProfit, gm: round2(r.totals.grossMargin), n: r.totals.netProfit, nm: round2(r.totals.netMargin), gr: r.growth === null ? "" : round2(r.growth) },
  )
  return {
    id: "FR-05",
    title: "Financial years since inception",
    subtitle: SOURCE_LABEL[source],
    summary: cagr ? [{ label: `Revenue CAGR ${cagr.from}–${cagr.to}`, value: `${cagr.rate.toFixed(1)}%` }] : undefined,
    tables: [{ title: "Every financial year", columns, rows: body }],
    notes: ["The current financial year is year to date; its growth is against the same period last year.", ...systemNote({ key: "inception", label: "Since Inception", short: "", from: fyStart(fyList()[0]), to: todayISO(), compare: null }, source)],
  }
}

/** Every report for the current view, in reading order */
export function allReports(range: DateRange, source: Source): Report[] {
  const list = [kpiReport(range, source), plReport(range, source), bsReport(range, source), trendReport(range, source)]
  if (range.key === "inception") list.push(fyReport(source))
  return list
}

export function exportName(range: DateRange, source: Source, what: string): string {
  return `${COMPANY.short.replace(/\s+/g, "-")}-${what}-${range.key}-${source}-${todayISO()}`
}
