/**
 * Reporting status for the tracker: month-end close per month (last financial
 * year + this one, through the parallel run) and whether each standard report
 * agrees between QuickBooks and Xero today.
 */
import {
  conversionDate,
  currentFy,
  currentPeriod,
  fyLabel,
  fyOf,
  fyStart,
  formatShort,
  lastDayOfPeriod,
  periodLabel,
  periodRange,
  todayISO,
} from "../clock"
import { fmtMoney, round2 } from "../format"
import { ACCOUNT_BY_CODE, POSTING_ACCOUNTS, isPL } from "../data/chart"
import { balancesAt, compareTrialBalances, natural, plTotals } from "../data/ledger"
import { bankTransactions } from "../data/bank"
import { activeEffects, type Issue } from "../data/issues"
import type { Tone } from "./bank"
import { differs, explain, explainMany, touching, uniqueIssues } from "./explain"

// ---------------------------------------------------------------------------
// BAS quarters (Australian FY: Q1 Jul–Sep … Q4 Apr–Jun)

const Q_MONTHS = ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"]

export interface BasQuarter {
  fy: number
  q: number
  label: string
  start: string
  end: string
  due: string
}

export function basQuarterOf(period: string): BasQuarter {
  const fy = fyOf(period)
  const m = Number(period.slice(5, 7))
  const q = Math.floor(((m - 7 + 12) % 12) / 3) + 1
  const startPeriod = periodRange(`${fy - 1}-07`, `${fy}-06`)[(q - 1) * 3]
  const endPeriod = periodRange(`${fy - 1}-07`, `${fy}-06`)[(q - 1) * 3 + 2]
  const dueByQ = [`${fy - 1}-10-28`, `${fy}-02-28`, `${fy}-04-28`, `${fy}-07-28`]
  return { fy, q, label: `Q${q} ${fyLabel(fy)} (${Q_MONTHS[q - 1]})`, start: `${startPeriod}-01`, end: lastDayOfPeriod(endPeriod), due: dueByQ[q - 1] }
}

export interface Cell {
  tone: Tone
  label: string
  detail?: string
}

function gstDiffAt(iso: string): number {
  const q = balancesAt(iso, "qbo")["2200"] ?? 0
  const x = balancesAt(iso, "xero")["2200"] ?? 0
  return round2(natural("2200", x) - natural("2200", q))
}

export function basStatus(b: BasQuarter, list: Issue[]): Cell {
  const today = todayISO()
  const conv = conversionDate()
  if (b.end < conv) {
    return b.due <= today ? { tone: "success", label: "Lodged from QuickBooks", detail: `Due ${formatShort(b.due)}` } : { tone: "info", label: "Lodge from QuickBooks", detail: `Due ${formatShort(b.due)}` }
  }
  const at = b.end < today ? b.end : today
  const diff = gstDiffAt(at)
  if (differs(diff)) {
    const ids = explain("2200", list, b.start, at).issues.map((i) => i.id)
    return { tone: "warning", label: `GST differs by $${fmtMoney(Math.abs(diff))}`, detail: `Lodge from Xero, due ${formatShort(b.due)}${ids.length ? ` · ${ids.join(", ")}` : ""}` }
  }
  return { tone: b.end < today ? "info" : "muted", label: b.end < today ? "Ready to lodge from Xero" : "In progress", detail: `Due ${formatShort(b.due)}` }
}

// ---------------------------------------------------------------------------
// Month-end close

export interface CloseRow {
  period: string
  label: string
  phase: "history" | "parallel"
  current: boolean
  qbo: Cell
  xero: Cell
  tb: Cell & { diffs: number }
  bas: Cell & { quarter: string }
}

export function monthEndClose(list: Issue[]): CloseRow[] {
  const today = todayISO()
  const now = currentPeriod()
  const conv = conversionDate().slice(0, 7)
  const txns = bankTransactions()
  const effects = activeEffects()
  const periods = periodRange(fyStart(currentFy() - 1).slice(0, 7), now)
  return periods
    .map((p) => {
      const current = p === now
      const asAt = current ? today : lastDayOfPeriod(p)
      const phase: CloseRow["phase"] = p < conv ? "history" : "parallel"
      const qbo: Cell = current ? { tone: "info", label: "Open", detail: "Current month" } : phase === "history" ? { tone: "success", label: "Closed and locked", detail: "Closing date set before migration" } : { tone: "success", label: "Closed", detail: "Still updated for the parallel run" }

      let xero: Cell
      if (phase === "history") xero = { tone: "muted", label: "Migrated history", detail: "Reconciliation history doesn't migrate" }
      else {
        const rows = txns.filter((t) => t.date.slice(0, 7) === p && !t.statementRef.startsWith("—"))
        const waiting = rows.filter((t) => t.xero.status === "unreconciled" || t.xero.status === "missing").length
        xero = waiting === 0 ? { tone: "success", label: "Reconciled", detail: `${rows.length} statement lines` } : { tone: current ? "info" : "warning", label: `${waiting} lines to reconcile`, detail: `of ${rows.length} statement lines` }
      }

      // Xero = QuickBooks + the effects of unresolved issues, so with no effect dated on or before
      // this month-end the two trial balances are identical and need no recalculation.
      const diffs = effects.some((e) => e.date <= asAt) ? compareTrialBalances(asAt).filter((r) => differs(r.diff)).length : 0
      const tb = diffs === 0 ? { tone: "success" as Tone, label: "Agrees", diffs } : { tone: "danger" as Tone, label: `${diffs} accounts differ`, diffs }
      const quarter = basQuarterOf(p)
      return { period: p, label: periodLabel(p), phase, current, qbo, xero, tb, bas: { ...basStatus(quarter, list), quarter: quarter.label } }
    })
    .reverse()
}

// ---------------------------------------------------------------------------
// Standard reports: agree or differ today

export type Agreement = "agrees" | "partly" | "differs"

export interface StandardReportRow {
  key: string
  name: string
  basis: string
  /** Figure compared, in plain words */
  measure: string
  qbo: number
  xero: number
  diff: number
  agreement: Agreement
  detail: string
  issues: Issue[]
}

export function standardReports(list: Issue[]): StandardReportRow[] {
  const today = todayISO()
  const fy = currentFy()
  const from = fyStart(fy)
  const conv = conversionDate()
  const qPl = plTotals(from, today, "qbo")
  const xPl = plTotals(from, today, "xero")
  const qb = balancesAt(today, "qbo")
  const xb = balancesAt(today, "xero")
  const tb = compareTrialBalances(today)
  const tbDiffs = tb.filter((r) => differs(r.diff))
  const plCodes = POSTING_ACCOUNTS.filter(isPL).map((a) => a.code)
  const bsCodes = POSTING_ACCOUNTS.filter((a) => !isPL(a)).map((a) => a.code)
  const bsDiffs = bsCodes.filter((c) => differs((xb[c] ?? 0) - (qb[c] ?? 0)))
  const plDiffs = plCodes.filter((c) => tbDiffs.some((r) => r.code === c))
  const netAssets = (b: Record<string, number>) => bsCodes.filter((c) => ACCOUNT_BY_CODE[c].section !== "equity").reduce((t, c) => t + (b[c] ?? 0), 0)
  const debits = (side: "qbo" | "xero") => round2(tb.reduce((t, r) => t + Math.max(0, r[side]), 0))
  const nat = (code: string, b: Record<string, number>) => round2(natural(code, b[code] ?? 0))
  const quarter = basQuarterOf(currentPeriod())

  const row = (r: Omit<StandardReportRow, "diff" | "agreement"> & { agreement?: Agreement }): StandardReportRow => {
    const diff = round2(r.xero - r.qbo)
    return { ...r, diff, agreement: r.agreement ?? (differs(diff) ? "differs" : "agrees") }
  }

  const arIssues = uniqueIssues(explain("1100", list, conv, today).issues, touching(["1100"], list).filter((i) => ["Receivables", "Contacts"].includes(i.area)))
  const arDiff = nat("1100", xb) - nat("1100", qb)

  return [
    row({
      key: "pl",
      name: "Profit and loss",
      basis: `${fyLabel(fy)} year to date`,
      measure: "Net profit",
      qbo: qPl.netProfit,
      xero: xPl.netProfit,
      detail: plDiffs.length ? `${plDiffs.length} accounts differ` : "Every account agrees",
      issues: explainMany(plCodes, list, from, today),
    }),
    row({
      key: "bs",
      name: "Balance sheet",
      basis: `At ${formatShort(today)}`,
      measure: "Net assets",
      qbo: round2(netAssets(qb)),
      xero: round2(netAssets(xb)),
      agreement: bsDiffs.length ? "differs" : undefined,
      detail: bsDiffs.length ? `${bsDiffs.length} accounts differ` : "Every account agrees",
      issues: explainMany(bsCodes, list, conv, today),
    }),
    row({
      key: "tb",
      name: "Trial balance",
      basis: `At ${formatShort(today)}`,
      measure: "Total debits",
      qbo: debits("qbo"),
      xero: debits("xero"),
      agreement: tbDiffs.length ? "differs" : undefined,
      detail: tbDiffs.length ? `${tbDiffs.length} accounts differ` : "Every account agrees",
      issues: explainMany(tbDiffs.map((r) => r.code), list, conv, today),
    }),
    row({
      key: "ar",
      name: "Aged receivables",
      basis: `At ${formatShort(today)}`,
      measure: "Total owed by customers",
      qbo: nat("1100", qb),
      xero: nat("1100", xb),
      agreement: differs(arDiff) ? "differs" : arIssues.length ? "partly" : "agrees",
      detail: differs(arDiff) ? "Totals differ" : arIssues.length ? "Totals agree, per-customer ageing differs" : "Totals and ageing agree",
      issues: arIssues,
    }),
    row({
      key: "ap",
      name: "Aged payables",
      basis: `At ${formatShort(today)}`,
      measure: "Total owed to suppliers",
      qbo: nat("2000", qb),
      xero: nat("2000", xb),
      detail: differs(nat("2000", xb) - nat("2000", qb)) ? "Totals differ" : "Totals and ageing agree",
      issues: uniqueIssues(explain("2000", list, conv, today).issues, touching(["2000"], list)),
    }),
    row({
      key: "gst",
      name: "GST (BAS)",
      basis: quarter.label,
      measure: "GST payable",
      qbo: nat("2200", qb),
      xero: nat("2200", xb),
      detail: differs(nat("2200", xb) - nat("2200", qb)) ? `GST account differs · due ${formatShort(quarter.due)}` : `Agrees · due ${formatShort(quarter.due)}`,
      issues: explain("2200", list, conv, today).issues,
    }),
  ]
}

export const AGREEMENT_LABEL: Record<Agreement, string> = { agrees: "Agrees", partly: "Partly agrees", differs: "Differs" }
