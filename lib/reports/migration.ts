/**
 * Migration comparisons (QuickBooks Online vs Xero staging) and the comparative
 * reports produced at go-live. The Validate step, the Go-live step and the
 * PDF/Excel downloads all read these functions, so they always agree.
 */
import { addDays, addMonths, conversionDate, fyEnd, fyLabel, fyOf, fyStart, formatShort, migratedThrough } from "../clock"
import { COMPANY } from "../data/company"
import { CHART, SECTION_LABEL, type Section } from "../data/chart"
import { balanceSheet, balancesAt, bankBalances, compareTrialBalances, natural, plBetween, plTotals, type System } from "../data/ledger"
import {
  AGEING_BUCKETS,
  AP_AGEING,
  AP_OTHER_SUPPLIERS,
  AP_SUPPLIERS,
  AR_AGEING,
  AR_CUSTOMERS,
  AR_OTHER_CUSTOMERS,
  ATTACHMENTS,
  HEADER_ACCOUNT_COUNT,
  NOT_MIGRATED,
  SUB_ACCOUNT_COUNT,
  scanRows,
  scanTotals,
  scopeWindow,
  splitByShares,
  type ScopeWindow,
} from "../data/migration"
import { round2 } from "../format"
import type { HistoryScope } from "../demo-store"
import type { Report, ReportCtx, Table } from "./types"

const EPS = 0.005
const ok = (diff: number) => Math.abs(diff) < EPS
const statusText = (diff: number) => (ok(diff) ? "Match" : "Differs")

function maxIso(a: string, b: string) {
  return a > b ? a : b
}
function minIso(a: string, b: string) {
  return a < b ? a : b
}

// ---------------------------------------------------------------------------
// Comparison data

export interface TbCheck {
  label: string
  date: string
  accounts: number
  qboDebits: number
  xeroDebits: number
  mismatched: number
  diff: number
}

/** Trial balance at each financial-year end in scope and at the last migrated day */
export function tbChecks(w: ScopeWindow): TbCheck[] {
  const dates: { label: string; date: string }[] = []
  for (const fy of w.fys) {
    const end = fyEnd(fy)
    if (end >= w.comparativeFrom && end < w.through) dates.push({ label: `${fyLabel(fy)} year end`, date: end })
  }
  dates.push({ label: "Conversion balances", date: w.through })
  return dates.map(({ label, date }) => {
    const rows = compareTrialBalances(date)
    const qboDebits = round2(rows.reduce((t, r) => t + Math.max(0, r.qbo), 0))
    const xeroDebits = round2(rows.reduce((t, r) => t + Math.max(0, r.xero), 0))
    const mismatched = rows.filter((r) => !ok(r.diff)).length
    return { label, date, accounts: rows.length, qboDebits, xeroDebits, mismatched, diff: round2(xeroDebits - qboDebits) }
  })
}

export interface PlCheck {
  fy: number
  label: string
  from: string
  to: string
  partial: boolean
  qbo: ReturnType<typeof plTotals>
  xero: ReturnType<typeof plTotals>
  diff: number
}

/** P&L per financial year in scope (the conversion year to the last migrated day) */
export function plChecks(w: ScopeWindow): PlCheck[] {
  return w.fys.map((fy) => {
    const from = maxIso(fyStart(fy), w.comparativeFrom)
    const to = minIso(fyEnd(fy), w.through)
    const qbo = plTotals(from, to, "qbo")
    const xero = plTotals(from, to, "xero")
    const partial = from !== fyStart(fy) || to !== fyEnd(fy)
    return { fy, label: partial ? `${fyLabel(fy)} (${formatShort(from)} – ${formatShort(to)})` : fyLabel(fy), from, to, partial, qbo, xero, diff: round2(xero.netProfit - qbo.netProfit) }
  })
}

export function bsCheck(w: ScopeWindow) {
  const q = balanceSheet(w.through, "qbo")
  const x = balanceSheet(w.through, "xero")
  return q.sections.map((s, i) => ({ section: s.section, label: SECTION_LABEL[s.section], qbo: s.total, xero: x.sections[i].total, diff: round2(x.sections[i].total - s.total) }))
}

export function ageing(kind: "ar" | "ap", w: ScopeWindow) {
  const code = kind === "ar" ? "1100" : "2000"
  const shares = kind === "ar" ? AR_AGEING : AP_AGEING
  const q = round2(natural(code, balancesAt(w.through, "qbo")[code]))
  const x = round2(natural(code, balancesAt(w.through, "xero")[code]))
  const qb = splitByShares(q, shares)
  const xb = splitByShares(x, shares)
  return { total: { qbo: q, xero: x, diff: round2(x - q) }, buckets: AGEING_BUCKETS.map((b, i) => ({ bucket: b, qbo: qb[i], xero: xb[i], diff: round2(xb[i] - qb[i]) })) }
}

export function ageingByContact(kind: "ar" | "ap", w: ScopeWindow) {
  const a = ageing(kind, w)
  const list = kind === "ar" ? AR_CUSTOMERS : AP_SUPPLIERS
  const otherCount = kind === "ar" ? AR_OTHER_CUSTOMERS : AP_OTHER_SUPPLIERS
  const shares = [...list.map((c) => c.share), 1 - list.reduce((t, c) => t + c.share, 0)]
  const parts = splitByShares(a.total.qbo, shares)
  const xparts = splitByShares(a.total.xero, shares)
  return [...list.map((c) => c.name), `Other ${kind === "ar" ? "customers" : "suppliers"} (${otherCount})`].map((name, i) => ({ name, qbo: parts[i], xero: xparts[i], diff: round2(xparts[i] - parts[i]) }))
}

export function bankChecks(w: ScopeWindow) {
  return bankBalances(w.through).map((b) => ({ ...b, diff: round2(b.xero - b.qbo) }))
}

const GST_SALES = CHART.filter((a) => a.xeroTax === "GST on Income").map((a) => a.code)
const GST_PURCHASES = CHART.filter((a) => a.xeroTax === "GST on Expenses").map((a) => a.code)

function gstFor(from: string, to: string, system: System) {
  const pl = plBetween(from, to, system)
  const sales = round2(-GST_SALES.reduce((t, c) => t + (pl[c] ?? 0), 0) * 0.1)
  const purchases = round2(GST_PURCHASES.reduce((t, c) => t + (pl[c] ?? 0), 0) * 0.1)
  return { sales, purchases, net: round2(sales - purchases) }
}

export interface GstCheck {
  label: string
  from: string
  to: string
  qbo: ReturnType<typeof gstFor>
  xero: ReturnType<typeof gstFor>
  diff: number
}

/** GST per BAS quarter in scope (most recent first). `limit` keeps the screen short. */
export function gstChecks(w: ScopeWindow, limit?: number): { rows: GstCheck[]; total: number } {
  const out: GstCheck[] = []
  // BAS needs tax-coded detail, so quarters are checked inside the detail window (monthly balances only when there is no detail)
  const gstFrom = w.detailFrom ?? w.comparativeFrom
  // Quarters end in Sep, Dec, Mar, Jun. Walk back from the last full quarter before the conversion date.
  let endPeriod = w.through.slice(0, 7)
  while (![3, 6, 9, 12].includes(Number(endPeriod.slice(5, 7)))) endPeriod = addMonths(endPeriod, -1)
  for (;;) {
    const startPeriod = addMonths(endPeriod, -2)
    const from = `${startPeriod}-01`
    const to = addDays(`${addMonths(endPeriod, 1)}-01`, -1)
    if (from < gstFrom || to > w.through) break
    const qbo = gstFor(from, to, "qbo")
    const xero = gstFor(from, to, "xero")
    const q = Math.ceil(((Number(endPeriod.slice(5, 7)) + 5) % 12 || 12) / 3)
    out.push({ label: `${fyLabel(fyOf(from))} Q${q}`, from, to, qbo, xero, diff: round2(xero.net - qbo.net) })
    endPeriod = addMonths(endPeriod, -3)
  }
  return { rows: limit ? out.slice(0, limit) : out, total: out.length }
}

export interface Warning {
  title: string
  detail: string
}

export function migrationWarnings(w: ScopeWindow): Warning[] {
  const uncategorised = round2(plBetween(w.comparativeFrom, w.through)["6990"] ?? 0)
  return [
    { title: `${SUB_ACCOUNT_COUNT} sub-accounts flattened`, detail: `Xero has no account hierarchy. Sub-accounts become separate accounts and ${HEADER_ACCOUNT_COUNT} header accounts are not needed. Totals are unchanged.` },
    { title: "Uncategorised Expense mapped to 429", detail: `${fmt(uncategorised)} in QuickBooks Uncategorised Expense goes to Xero 429 General Expenses. Reclassify in Xero if you know where it belongs.` },
    { title: `${ATTACHMENTS.over10mb} large attachments compressed`, detail: `Xero allows files up to 10 MB. The largest was ${ATTACHMENTS.largestMb} MB; every original is kept in the archive.` },
  ]
}

function fmt(n: number) {
  const s = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))
  return n < 0 ? `($${s})` : `$${s}`
}

/** Everything the Validate step checks, with an overall pass flag */
export function validationSummary(scope: HistoryScope) {
  const w = scopeWindow(scope)
  const tb = tbChecks(w)
  const pl = plChecks(w)
  const bs = bsCheck(w)
  const ar = ageing("ar", w)
  const ap = ageing("ap", w)
  const bank = bankChecks(w)
  const gst = gstChecks(w)
  const groups = [
    { key: "tb", label: "Trial balance", count: tb.length, pass: tb.every((t) => t.mismatched === 0) },
    { key: "pl", label: "Profit and loss", count: pl.length, pass: pl.every((p) => ok(p.diff) && ok(p.xero.income - p.qbo.income)) },
    { key: "bs", label: "Balance sheet", count: bs.length, pass: bs.every((b) => ok(b.diff)) },
    { key: "ageing", label: "Aged receivables and payables", count: 2, pass: ok(ar.total.diff) && ok(ap.total.diff) },
    { key: "bank", label: "Bank and card balances", count: bank.length, pass: bank.every((b) => ok(b.diff)) },
    { key: "gst", label: "GST by BAS quarter", count: gst.total, pass: gst.rows.every((g) => ok(g.diff)) },
  ]
  return { w, tb, pl, bs, ar, ap, bank, gst, groups, checks: groups.reduce((t, g) => t + g.count, 0), pass: groups.every((g) => g.pass), warnings: migrationWarnings(w) }
}

// ---------------------------------------------------------------------------
// Reports

export function migrationCtx(scope: HistoryScope): ReportCtx {
  const w = scopeWindow(scope)
  return {
    company: COMPANY.name,
    period: `${formatShort(w.comparativeFrom)} – ${formatShort(w.through)}`,
    scope: "QuickBooks Online vs Xero",
    reference: `MIG-${conversionDate().replace(/-/g, "")}`,
    generatedAt: new Date().toISOString(),
  }
}

export function tbComparisonReport(scope: HistoryScope): Report {
  const w = scopeWindow(scope)
  const rows = compareTrialBalances(w.through)
  const checks = tbChecks(w)
  const debit = (v: number) => (v > 0 ? v : 0)
  const credit = (v: number) => (v < 0 ? -v : 0)
  const detail: Table = {
    title: `Trial balance at ${formatShort(w.through)} (account by account)`,
    columns: [
      { key: "code", label: "QBO code" },
      { key: "name", label: "QuickBooks account" },
      { key: "xeroCode", label: "Xero code" },
      { key: "qboDr", label: "QBO debit", kind: "money" },
      { key: "qboCr", label: "QBO credit", kind: "money" },
      { key: "xeroDr", label: "Xero debit", kind: "money" },
      { key: "xeroCr", label: "Xero credit", kind: "money" },
      { key: "diff", label: "Difference", kind: "money" },
      { key: "status", label: "Status", kind: "status" },
    ],
    rows: rows.map((r) => ({ code: r.code, name: r.name, xeroCode: r.xeroCode, qboDr: debit(r.qbo), qboCr: credit(r.qbo), xeroDr: debit(r.xero), xeroCr: credit(r.xero), diff: r.diff, status: statusText(r.diff) })),
    footer: {
      name: "Totals",
      qboDr: round2(rows.reduce((t, r) => t + debit(r.qbo), 0)),
      qboCr: round2(rows.reduce((t, r) => t + credit(r.qbo), 0)),
      xeroDr: round2(rows.reduce((t, r) => t + debit(r.xero), 0)),
      xeroCr: round2(rows.reduce((t, r) => t + credit(r.xero), 0)),
      diff: round2(rows.reduce((t, r) => t + r.diff, 0)),
    },
  }
  const byPeriod: Table = {
    title: "Trial balance totals by period",
    columns: [
      { key: "label", label: "Period" },
      { key: "date", label: "As at" },
      { key: "accounts", label: "Accounts", kind: "int" },
      { key: "qbo", label: "QBO total debits", kind: "money" },
      { key: "xero", label: "Xero total debits", kind: "money" },
      { key: "mismatched", label: "Accounts that differ", kind: "int" },
      { key: "status", label: "Status", kind: "status" },
    ],
    rows: checks.map((c) => ({ label: c.label, date: formatShort(c.date), accounts: c.accounts, qbo: c.qboDebits, xero: c.xeroDebits, mismatched: c.mismatched, status: c.mismatched ? "Differs" : "Match" })),
  }
  const allOk = checks.every((c) => c.mismatched === 0)
  return {
    id: "M-01",
    title: "Trial balance comparison",
    subtitle: `As at ${formatShort(w.through)}`,
    status: allOk ? "pass" : "fail",
    headline: allOk ? `QuickBooks and Xero agree account by account at ${checks.length} balance dates, including the conversion balances at ${formatShort(w.through)}.` : "Some accounts differ; see the detail.",
    summary: [
      { label: "Balance dates checked", value: String(checks.length) },
      { label: "Accounts compared", value: String(rows.length) },
      { label: "Total debits (Xero)", value: fmt(detail.footer!.xeroDr as number) },
      { label: "Difference", value: fmt(detail.footer!.diff as number) },
    ],
    tables: [byPeriod, detail],
    notes: ["Sub-accounts are flattened in Xero; each QuickBooks account maps to exactly one Xero account.", "Current Year Earnings is calculated by both systems and is not a posting account."],
  }
}

export function plByFyReport(scope: HistoryScope): Report {
  const w = scopeWindow(scope)
  const checks = plChecks(w)
  const summary: Table = {
    title: "Profit and loss by financial year",
    columns: [
      { key: "fy", label: "Financial year" },
      { key: "qboIncome", label: "QBO income", kind: "money" },
      { key: "xeroIncome", label: "Xero income", kind: "money" },
      { key: "qboGp", label: "QBO gross profit", kind: "money" },
      { key: "xeroGp", label: "Xero gross profit", kind: "money" },
      { key: "qboNp", label: "QBO net profit", kind: "money" },
      { key: "xeroNp", label: "Xero net profit", kind: "money" },
      { key: "status", label: "Status", kind: "status" },
    ],
    rows: checks.map((c) => ({
      fy: c.label,
      qboIncome: c.qbo.income,
      xeroIncome: c.xero.income,
      qboGp: c.qbo.grossProfit,
      xeroGp: c.xero.grossProfit,
      qboNp: c.qbo.netProfit,
      xeroNp: c.xero.netProfit,
      status: statusText(c.diff),
    })),
  }
  const latest = checks[checks.length - 1]
  const q = plBetween(latest.from, latest.to, "qbo")
  const x = plBetween(latest.from, latest.to, "xero")
  const pl = CHART.filter((a) => !a.header && ["income", "cogs", "expense", "other-income", "other-expense"].includes(a.section))
  const detail: Table = {
    title: `${latest.label}: account by account`,
    columns: [
      { key: "section", label: "Section" },
      { key: "code", label: "QBO code" },
      { key: "name", label: "Account" },
      { key: "xeroCode", label: "Xero code" },
      { key: "qbo", label: "QuickBooks", kind: "money" },
      { key: "xero", label: "Xero", kind: "money" },
      { key: "diff", label: "Difference", kind: "money" },
    ],
    rows: pl.map((a) => {
      const qv = round2(natural(a, q[a.code] ?? 0))
      const xv = round2(natural(a, x[a.code] ?? 0))
      return { section: SECTION_LABEL[a.section as Section], code: a.code, name: a.name, xeroCode: a.xeroCode, qbo: qv, xero: xv, diff: round2(xv - qv) }
    }),
    footer: { name: "Net profit", qbo: latest.qbo.netProfit, xero: latest.xero.netProfit, diff: latest.diff },
  }
  const allOk = checks.every((c) => ok(c.diff))
  return {
    id: "M-02",
    title: "Profit and loss by financial year",
    subtitle: `${fyLabel(w.fys[0])} to ${fyLabel(w.fys[w.fys.length - 1])}`,
    status: allOk ? "pass" : "fail",
    headline: allOk ? `Income, gross profit and net profit agree for all ${checks.length} financial years migrated.` : "At least one year differs.",
    summary: [
      { label: "Years compared", value: String(checks.length) },
      { label: `Net profit ${latest.label.split(" ")[0]} (Xero)`, value: fmt(latest.xero.netProfit) },
      { label: "Largest difference", value: fmt(Math.max(...checks.map((c) => Math.abs(c.diff)))) },
    ],
    tables: [summary, detail],
    notes: w.summaryMonths ? [`Years before ${formatShort(w.detailFrom ?? w.through)} were migrated as ${w.summaryMonths} monthly summary journals, so totals agree by account and month.`] : undefined,
  }
}

export function balanceSheetReport(scope: HistoryScope): Report {
  const w = scopeWindow(scope)
  const q = balanceSheet(w.through, "qbo")
  const x = balanceSheet(w.through, "xero")
  const tables: Table[] = q.sections.map((s, i) => ({
    title: SECTION_LABEL[s.section],
    columns: [
      { key: "code", label: "QBO code" },
      { key: "name", label: "Account" },
      { key: "xeroCode", label: "Xero code" },
      { key: "qbo", label: "QuickBooks", kind: "money" },
      { key: "xero", label: "Xero", kind: "money" },
      { key: "diff", label: "Difference", kind: "money" },
    ],
    rows: s.rows.map((r) => {
      const xr = x.sections[i].rows.find((y) => y.code === r.code)
      const xv = xr?.amount ?? 0
      return { code: r.code, name: r.name, xeroCode: r.xeroCode, qbo: r.amount, xero: xv, diff: round2(xv - r.amount) }
    }),
    footer: { name: `Total ${SECTION_LABEL[s.section].toLowerCase()}`, qbo: s.total, xero: x.sections[i].total, diff: round2(x.sections[i].total - s.total) },
  }))
  const allOk = bsCheck(w).every((b) => ok(b.diff))
  return {
    id: "M-03",
    title: "Balance sheet comparison",
    subtitle: `As at ${formatShort(w.through)}`,
    status: allOk ? "pass" : "fail",
    headline: allOk ? `Every balance sheet account agrees at ${formatShort(w.through)}, the day before Xero went live.` : "Some balances differ.",
    summary: [
      { label: "Total assets", value: fmt(x.sections[0].total) },
      { label: "Total liabilities", value: fmt(x.sections[1].total) },
      { label: "Net assets", value: fmt(x.netAssets) },
      { label: "Difference", value: fmt(round2(x.netAssets - q.netAssets)) },
    ],
    tables,
  }
}

function ageingReport(kind: "ar" | "ap", scope: HistoryScope): Report {
  const w = scopeWindow(scope)
  const a = ageing(kind, w)
  const contacts = ageingByContact(kind, w)
  const ar = kind === "ar"
  const buckets: Table = {
    title: "By age",
    columns: [
      { key: "bucket", label: "Age" },
      { key: "qbo", label: "QuickBooks", kind: "money" },
      { key: "xero", label: "Xero", kind: "money" },
      { key: "diff", label: "Difference", kind: "money" },
      { key: "status", label: "Status", kind: "status" },
    ],
    rows: a.buckets.map((b) => ({ ...b, status: statusText(b.diff) })),
    footer: { bucket: "Total", qbo: a.total.qbo, xero: a.total.xero, diff: a.total.diff },
  }
  const byContact: Table = {
    title: ar ? "By customer" : "By supplier",
    columns: [
      { key: "name", label: ar ? "Customer" : "Supplier" },
      { key: "qbo", label: "QuickBooks", kind: "money" },
      { key: "xero", label: "Xero", kind: "money" },
      { key: "diff", label: "Difference", kind: "money" },
    ],
    rows: contacts,
    footer: { name: "Total", qbo: a.total.qbo, xero: a.total.xero, diff: a.total.diff },
  }
  return {
    id: ar ? "M-04" : "M-05",
    title: ar ? "Aged receivables comparison" : "Aged payables comparison",
    subtitle: `As at ${formatShort(w.through)}`,
    status: ok(a.total.diff) ? "pass" : "fail",
    headline: ar
      ? `Open invoices were migrated one by one with their original dates, so ageing agrees with QuickBooks: ${fmt(a.total.xero)} outstanding.`
      : `Open bills were migrated one by one with their original dates and due dates: ${fmt(a.total.xero)} owing.`,
    summary: [
      { label: "Outstanding (Xero)", value: fmt(a.total.xero) },
      { label: "Over 90 days", value: fmt(a.buckets[4].xero) },
      { label: "Difference", value: fmt(a.total.diff) },
    ],
    tables: [buckets, byContact],
  }
}

export const agedReceivablesReport = (scope: HistoryScope) => ageingReport("ar", scope)
export const agedPayablesReport = (scope: HistoryScope) => ageingReport("ap", scope)

export function manifestReport(scope: HistoryScope): Report {
  const w = scopeWindow(scope)
  const rows = scanRows(scope)
  const totals = scanTotals(scope)
  const entities: Table = {
    title: "Records migrated",
    columns: [
      { key: "name", label: "QuickBooks records" },
      { key: "qboEntity", label: "QBO entity" },
      { key: "total", label: "In QuickBooks", kind: "int" },
      { key: "migrating", label: "Migrated", kind: "int" },
      { key: "destination", label: "Destination" },
      { key: "becomes", label: "Becomes" },
      { key: "note", label: "Notes" },
    ],
    rows: [
      ...rows.map((r) => ({ name: r.name, qboEntity: r.qboEntity, total: r.total, migrating: r.migrating, destination: "Xero", becomes: r.becomes, note: r.note ?? "" })),
      ...(w.summaryMonths ? [{ name: "Monthly comparative balances", qboEntity: "Report (TrialBalance)", total: w.summaryMonths, migrating: w.summaryMonths, destination: "Xero", becomes: "Monthly summary journals", note: `${formatShort(w.summaryFrom!)} – ${formatShort(w.summaryTo!)}` }] : []),
    ],
    footer: { name: "Total", total: totals.inQbo, migrating: totals.total },
  }
  const excluded: Table = {
    title: "Not migrated, and what we do instead",
    columns: [
      { key: "what", label: "Item" },
      { key: "why", label: "Why" },
      { key: "instead", label: "Instead" },
    ],
    rows: NOT_MIGRATED,
  }
  return {
    id: "M-06",
    title: "Migration manifest",
    subtitle: w.describe,
    status: "info",
    headline: `${totals.total.toLocaleString("en-AU")} records moved to Xero. Conversion date ${formatShort(conversionDate())}; history migrated through ${formatShort(migratedThrough())}.`,
    summary: [
      { label: "Records to Xero", value: totals.xero.toLocaleString("en-AU") },
      { label: "Conversion date", value: formatShort(conversionDate()) },
      { label: "History", value: w.describe },
    ],
    tables: [entities, excluded],
  }
}

export function allMigrationReports(scope: HistoryScope): Report[] {
  return [tbComparisonReport(scope), plByFyReport(scope), balanceSheetReport(scope), agedReceivablesReport(scope), agedPayablesReport(scope), manifestReport(scope)]
}
