/**
 * Overview of the tracker: one health line per area, all derived from the same
 * functions the individual tabs use, so the numbers always agree.
 */
import { currentFy, fyLabel, fyStart, todayISO } from "../clock"
import { fmtMoney } from "../format"
import { POSTING_ACCOUNTS, isPL } from "../data/chart"
import { bankSummary } from "../data/bank"
import { compareTrialBalances, plTotals } from "../data/ledger"
import type { Issue } from "../data/issues"
import { reconciliation, type Tone } from "./bank"
import { dependencyLinks } from "./dependencies"
import { differs } from "./explain"
import { standardReports } from "./reporting"

export type TrackerTab = "overview" | "bank" | "figures" | "reconciliation" | "dependencies" | "exceptions" | "reporting" | "compare"

export const TRACKER_TABS: { key: TrackerTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "bank", label: "Bank transactions" },
  { key: "figures", label: "Financial figures" },
  { key: "reconciliation", label: "Reconciliation" },
  { key: "dependencies", label: "Source dependencies" },
  { key: "exceptions", label: "Discrepancies" },
  { key: "reporting", label: "Reporting status" },
  { key: "compare", label: "QBO vs Xero" },
]

export function isTrackerTab(v: string | null): v is TrackerTab {
  return !!v && TRACKER_TABS.some((t) => t.key === v)
}

export interface HealthArea {
  key: Exclude<TrackerTab, "overview">
  title: string
  metric: string
  sub: string
  tone: Tone
  status: string
}

export function healthAreas(list: Issue[]): HealthArea[] {
  const today = todayISO()
  const fy = currentFy()

  const bank = bankSummary()
  const bTotal = bank.reduce((t, b) => t + b.total, 0)
  const bMatched = bank.reduce((t, b) => t + b.matched, 0)
  const bExc = bank.reduce((t, b) => t + b.exceptions, 0)
  const bPending = bank.reduce((t, b) => t + b.pending, 0)

  const tb = compareTrialBalances(today)
  const tbDiffs = tb.filter((r) => differs(r.diff))
  const plCodes = new Set(POSTING_ACCOUNTS.filter(isPL).map((a) => a.code))
  const plDiffs = tbDiffs.filter((r) => plCodes.has(r.code)).length
  const npDiff = plTotals(fyStart(fy), today, "xero").netProfit - plTotals(fyStart(fy), today, "qbo").netProfit

  const recon = reconciliation(list)
  const reconOk = recon.filter((r) => !differs(r.diff)).length

  const links = dependencyLinks(list)
  const healthy = links.filter((l) => l.health === "healthy").length
  const broken = links.filter((l) => l.health === "issue").length

  const open = list.filter((i) => i.status !== "resolved")
  const high = open.filter((i) => i.severity === "high").length

  const reports = standardReports(list)
  const agree = reports.filter((r) => r.agreement === "agrees").length

  return [
    {
      key: "bank",
      title: "Bank transactions",
      metric: `${bMatched.toLocaleString("en-AU")} of ${bTotal.toLocaleString("en-AU")} matched`,
      sub: `${bExc} exceptions · ${bPending} waiting in Xero`,
      tone: bExc ? "danger" : bPending ? "info" : "success",
      status: bExc ? "Exceptions" : "Matched",
    },
    {
      key: "figures",
      title: "Financial figures",
      metric: plDiffs ? `${plDiffs} P&L accounts differ` : "All P&L accounts agree",
      sub: differs(npDiff) ? `${fyLabel(fy)} YTD net profit differs by $${fmtMoney(Math.abs(npDiff))}` : `${fyLabel(fy)} YTD net profit agrees`,
      tone: plDiffs ? "danger" : "success",
      status: plDiffs ? "Differs" : "Agrees",
    },
    {
      key: "reconciliation",
      title: "Reconciliation",
      metric: `${reconOk} of ${recon.length} accounts agree`,
      sub: `${recon.reduce((t, r) => t + r.unreconciled, 0)} Xero lines unreconciled · ${recon.reduce((t, r) => t + r.missing, 0)} missing`,
      tone: reconOk < recon.length ? "danger" : "success",
      status: reconOk < recon.length ? "Differs" : "Agrees",
    },
    {
      key: "dependencies",
      title: "Source dependencies",
      metric: `${healthy} of ${links.length} links healthy`,
      sub: broken ? `${broken} links have an open issue` : "No broken links",
      tone: broken ? "warning" : healthy < links.length ? "info" : "success",
      status: broken ? "Issues" : "Healthy",
    },
    {
      key: "exceptions",
      title: "Discrepancies",
      metric: `${open.length} open`,
      sub: `${high} high · ${open.filter((i) => i.severity === "medium").length} medium · ${open.filter((i) => i.severity === "low").length} low`,
      tone: high ? "danger" : open.length ? "warning" : "success",
      status: high ? "Action needed" : open.length ? "Review" : "Clear",
    },
    {
      key: "reporting",
      title: "Reporting status",
      metric: `${agree} of ${reports.length} reports agree`,
      sub: reports.filter((r) => r.agreement !== "agrees").map((r) => r.name).join(", ") || "Every standard report agrees",
      tone: agree < reports.length ? "warning" : "success",
      status: agree < reports.length ? "Differs" : "Agrees",
    },
    {
      key: "compare",
      title: "Trial balance",
      metric: tbDiffs.length ? `${tbDiffs.length} of ${tb.length} accounts differ` : `All ${tb.length} accounts agree`,
      sub: `QuickBooks vs Xero at today`,
      tone: tbDiffs.length ? "danger" : "success",
      status: tbDiffs.length ? "Differs" : "Agrees",
    },
  ]
}
