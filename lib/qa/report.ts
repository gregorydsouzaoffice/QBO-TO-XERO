/**
 * The AI QA report as Report objects (lib/reports/types.ts), so the screen,
 * the PDF attached to the email and the Excel download all agree.
 */
import { brand } from "../brand"
import { conversionDate, formatDateTime, formatShort } from "../clock"
import { fmtInt, fmtMoney } from "../format"
import { BANK_ACCOUNTS, COMPANY } from "../data/company"
import { KIND_LABEL, type Issue, type IssueStatus } from "../data/issues"
import { nextRunAt } from "../data/schedule"
import type { Report, ReportCtx, ReportStatus } from "../reports/types"
import { AREAS } from "./checks"
import type { CheckResult, CheckStatus, RunResult } from "./types"

export const CHECK_STATUS_LABEL: Record<CheckStatus, string> = { pass: "Pass", warn: "Warning", fail: "Fail" }
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = { open: "Open", "in-review": "In review", resolved: "Resolved" }
export const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const

export function runStatus(run: RunResult): ReportStatus {
  return run.counts.failed ? "fail" : run.counts.warnings ? "warning" : "pass"
}

export function varianceText(r: CheckResult): string {
  if (!r.measure) return "—"
  if (r.measure.ok) return r.measure.unit === "money" ? "$0.00" : "0"
  return r.measure.unit === "money" ? fmtMoney(r.measure.variance, { currency: true }) : fmtInt(r.measure.variance)
}

/** One-paragraph summary used in the report, the email and the page */
export function runHeadline(run: RunResult): string {
  const { counts, exceptions, bySeverity, needsReview } = run
  const parts = [
    `${counts.run} checks across QuickBooks Online, Xero and ${BANK_ACCOUNTS.length} bank and card feeds.`,
    counts.failed || counts.warnings ? `${counts.failed} failed and ${counts.warnings} ${counts.warnings === 1 ? "needs" : "need"} a look.` : "Every check passed.",
    exceptions.length
      ? `${exceptions.length} exception${exceptions.length === 1 ? " is" : "s are"} open (${bySeverity.high} high priority), worth ${fmtMoney(run.exceptionValue, { currency: true })} in total. ${needsReview.length} need${needsReview.length === 1 ? "s" : ""} a person to decide.`
      : "No exceptions are open.",
  ]
  return parts.join(" ")
}

export function qaReportCtx(run: RunResult): ReportCtx {
  return {
    company: COMPANY.name,
    period: `Parallel run since ${formatShort(conversionDate())} · run at ${formatDateTime(run.at)}`,
    scope: "QuickBooks Online vs Xero vs bank statements",
    reference: run.id,
    generatedAt: new Date(run.at.getTime() + run.durationSec * 1000).toISOString(),
  }
}

export function qaFileName(run: RunResult, ext: "pdf" | "xlsx"): string {
  return `${run.id}-AI-QA-report.${ext}`
}

type StatusOf = (issue: Issue) => IssueStatus

export function qaReports(run: RunResult, statusOf: StatusOf = (i) => i.status): Report[] {
  const status = runStatus(run)
  const sourceLabel = (i: Issue) => i.sourceLabel ?? "Bank"

  const summary: Report = {
    id: "QA-1",
    title: "AI QA report: summary",
    subtitle: `${run.manual ? "Manual run" : "Scheduled run"} ${run.id}`,
    status,
    headline: runHeadline(run),
    summary: [
      { label: "Checks run", value: String(run.counts.run) },
      { label: "Passed", value: String(run.counts.passed) },
      { label: "Warnings", value: String(run.counts.warnings) },
      { label: "Failed", value: String(run.counts.failed) },
      { label: "Open exceptions", value: `${run.exceptions.length} (${run.bySeverity.high} high)` },
      { label: "Need manual review", value: String(run.needsReview.length) },
    ],
    tables: [
      {
        title: "Results by area",
        columns: [
          { key: "area", label: "Area" },
          { key: "checks", label: "Checks", kind: "int" },
          { key: "passed", label: "Passed", kind: "int" },
          { key: "warnings", label: "Warnings", kind: "int" },
          { key: "failed", label: "Failed", kind: "int" },
          { key: "result", label: "Result", kind: "status" },
        ],
        rows: AREAS.map((a) => {
          const cs = run.checks.filter((c) => c.check.area === a.key)
          const failed = cs.filter((c) => c.status === "fail").length
          const warnings = cs.filter((c) => c.status === "warn").length
          return { area: a.responsibility, checks: cs.length, passed: cs.length - failed - warnings, warnings, failed, result: failed ? "Fail" : warnings ? "Warning" : "Pass" }
        }),
      },
      {
        title: "Open exceptions by severity",
        columns: [
          { key: "severity", label: "Severity", kind: "status" },
          { key: "count", label: "Exceptions", kind: "int" },
          { key: "review", label: "Need manual review", kind: "int" },
          { key: "value", label: "Value", kind: "money" },
        ],
        rows: (["high", "medium", "low"] as const).map((s) => {
          const list = run.exceptions.filter((i) => i.severity === s)
          return { severity: SEVERITY_LABEL[s], count: list.length, review: list.filter((i) => i.needsReview).length, value: list.reduce((t, i) => t + i.amount, 0) }
        }),
        footer: { severity: "Total", count: run.exceptions.length, review: run.needsReview.length, value: run.exceptionValue },
      },
      {
        title: "Data collected",
        columns: [
          { key: "source", label: "Source" },
          { key: "records", label: "Records scanned", kind: "int" },
        ],
        rows: [
          { source: "QuickBooks Online (transactions, lists, reports)", records: run.records.qbo },
          { source: "Xero (transactions, contacts, reports)", records: run.records.xero },
          { source: `Bank and card statements (${BANK_ACCOUNTS.length} feeds, since conversion)`, records: run.records.bank },
        ],
        footer: { source: `Total · run took ${run.durationSec} seconds`, records: run.records.total },
      },
    ],
    notes: [
      `Next scheduled run: ${formatDateTime(nextRunAt(run.at))}. The report is emailed after every run.`,
      `Overall confidence ${(run.confidence * 100).toFixed(0)}%. Every figure traces to QuickBooks, Xero or a bank statement.`,
      `Generated by the ${brand.productName} AI QA engine. Fixes made in Xero are confirmed at the next run.`,
    ],
  }

  const exceptions: Report = {
    id: "QA-2",
    title: "Exceptions requiring review",
    subtitle: `${run.exceptions.length} open · ${run.needsReview.length} need a person to decide`,
    status: run.exceptions.length ? (run.bySeverity.high ? "fail" : "warning") : "pass",
    headline: run.exceptions.length ? "Each exception lists the evidence the engine compared. Rows marked Differs are where the sources disagree." : "No open exceptions at this run.",
    tables: [
      {
        title: "Open exceptions",
        columns: [
          { key: "id", label: "ID" },
          { key: "title", label: "Exception" },
          { key: "severity", label: "Severity", kind: "status" },
          { key: "kind", label: "Kind" },
          { key: "area", label: "Area" },
          { key: "amount", label: "Amount", kind: "money" },
          { key: "confidence", label: "Confidence", kind: "pct" },
          { key: "status", label: "Status", kind: "status" },
          { key: "review", label: "Manual review" },
        ],
        rows: run.exceptions.map((i) => ({
          id: i.id,
          title: i.title,
          severity: SEVERITY_LABEL[i.severity],
          kind: KIND_LABEL[i.kind],
          area: i.area,
          amount: i.amount,
          confidence: i.confidence * 100,
          status: ISSUE_STATUS_LABEL[statusOf(i)],
          review: i.needsReview ? "Yes" : "No",
        })),
      },
      ...run.exceptions.map((i) => ({
        title: `${i.id} · ${i.title} · ${formatShort(i.date)}`,
        columns: [
          { key: "field", label: "Field" },
          { key: "qbo", label: "QuickBooks" },
          { key: "xero", label: "Xero" },
          { key: "source", label: sourceLabel(i) },
          { key: "result", label: "Result", kind: "status" as const },
        ],
        rows: [
          ...i.evidence.map((e) => ({ field: e.field, qbo: e.qbo ?? "", xero: e.xero ?? "", source: e.source ?? "", result: e.differs ? "Differs" : "Agrees" })),
        ],
      })),
    ],
    notes: run.exceptions.map((i) => `${i.id} finding (${Math.round(i.confidence * 100)}% confidence): ${i.finding}`),
  }

  const checks: Report = {
    id: "QA-3",
    title: "All checks and results",
    subtitle: `${run.counts.passed} passed · ${run.counts.warnings} warnings · ${run.counts.failed} failed`,
    status,
    tables: AREAS.map((a) => ({
      title: a.responsibility,
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Check" },
        { key: "compares", label: "What it compares" },
        { key: "result", label: "Result", kind: "status" as const },
        { key: "variance", label: "Difference" },
        { key: "linked", label: "Exceptions" },
        { key: "detail", label: "Detail" },
      ],
      rows: run.checks
        .filter((c) => c.check.area === a.key)
        .map((c) => ({
          id: c.check.id,
          name: c.check.name,
          compares: c.check.compares,
          result: CHECK_STATUS_LABEL[c.status],
          variance: varianceText(c),
          linked: c.issues.map((i) => i.id).join(", ") || "—",
          detail: c.measure?.detail ?? "",
        })),
    })),
  }

  const recommendations: Report = {
    id: "QA-4",
    title: "Recommendations",
    subtitle: "What to do next, most important first",
    status: run.exceptions.length ? "warning" : "pass",
    tables: [
      {
        title: "Recommended actions",
        columns: [
          { key: "id", label: "ID" },
          { key: "severity", label: "Severity", kind: "status" },
          { key: "action", label: "Recommended action" },
          { key: "who", label: "Who" },
          { key: "confidence", label: "Confidence", kind: "pct" },
        ],
        rows: run.exceptions.map((i) => ({
          id: i.id,
          severity: SEVERITY_LABEL[i.severity],
          action: i.recommendation,
          who: i.needsReview ? "Needs a person to decide" : "Accounts team can fix in Xero",
          confidence: i.confidence * 100,
        })),
      },
    ],
    notes: [
      "During the parallel run, enter new bills, invoices and expenses in Xero only. Most exceptions come from entries made in one system.",
      "Bank feeds that reconnect do not always back-fill. Import the statement for any gap the engine reports.",
      `QuickBooks can be switched off once a run reports no high or medium exceptions and every difference is explained (check QVX-07).`,
    ],
  }

  return [summary, exceptions, checks, recommendations]
}
