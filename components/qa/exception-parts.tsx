"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleDot, Clock3, Flag, Minus, Radar, XCircle } from "lucide-react"
import { Money } from "@/components/figures"
import { formatDateTime, formatShort } from "@/lib/clock"
import { ACCOUNT_BY_CODE, SECTION_LABEL } from "@/lib/data/chart"
import type { Issue, IssueStatus } from "@/lib/data/issues"
import { natural } from "@/lib/data/ledger"
import { nextRunAt, runId } from "@/lib/data/schedule"
import { issueTimeline } from "@/lib/qa/engine"
import type { CheckResult, Fixes, RunResult } from "@/lib/qa/types"
import { cn } from "@/lib/utils"
import { CheckStatusPill } from "./status"

/** Field | QuickBooks | Xero | Bank/Source, differing rows highlighted with icon + text */
export function EvidenceTable({ issue }: { issue: Issue }) {
  const hasSource = issue.evidence.some((e) => e.source !== undefined)
  const sourceLabel = issue.sourceLabel ?? "Bank"
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[640px]">
        <thead>
          <tr>
            <th>Field</th>
            <th>QuickBooks</th>
            <th>Xero</th>
            {hasSource && <th>{sourceLabel}</th>}
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {issue.evidence.map((e) => {
            const values = [e.qbo, e.xero, e.source].filter((v) => v !== undefined && v !== "").length
            return (
              <tr key={e.field} className={cn(e.differs && "bg-destructive/5")}>
                <td className="font-medium">{e.field}</td>
                <td>{e.qbo || <span className="text-muted-foreground">—</span>}</td>
                <td className={cn(e.differs && "font-semibold")}>{e.xero || <span className="text-muted-foreground">—</span>}</td>
                {hasSource && <td>{e.source || <span className="text-muted-foreground">—</span>}</td>}
                <td>
                  {e.differs ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Differs
                    </span>
                  ) : values >= 2 ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Agrees
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Minus className="h-3.5 w-3.5" /> Info
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function AffectedAccounts({ issue }: { issue: Issue }) {
  return (
    <ul className="divide-y divide-border">
      {issue.accounts.map((code) => {
        const a = ACCOUNT_BY_CODE[code]
        if (!a) return null
        return (
          <li key={code} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-mono text-xs text-muted-foreground">QBO {a.code}</span> <span className="font-medium">{a.name}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="maps to" />
            <span className="min-w-0 flex-1">
              <span className="font-mono text-xs text-muted-foreground">Xero {a.xeroCode}</span> <span className="font-medium">{a.xeroName}</span>
            </span>
            <span className="text-xs text-muted-foreground">{SECTION_LABEL[a.section]}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Effect on Xero compared with QuickBooks, per account (from the issue's effects) */
export function EffectsTable({ issue }: { issue: Issue }) {
  if (!issue.effects.length)
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        No effect on account balances: totals agree in both systems. The difference is in the detail ({issue.area.toLowerCase()}), so reports by customer, tracking or job are affected until it is fixed.
      </p>
    )
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th className="num">Xero vs QuickBooks</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {issue.effects.map((e) => {
            const a = ACCOUNT_BY_CODE[e.code]
            const n = natural(e.code, e.amount)
            return (
              <tr key={e.code}>
                <td>
                  <div className="font-medium">{a?.xeroName ?? e.code}</div>
                  <div className="text-xs text-muted-foreground">
                    Xero {a?.xeroCode} · QBO {e.code}
                  </div>
                </td>
                <td className="num font-semibold">
                  {n > 0 ? "+" : "−"}
                  <Money value={Math.abs(n)} />
                </td>
                <td className="text-sm">
                  Xero is {n > 0 ? "higher" : "lower"} by <Money value={Math.abs(n)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function LinkedChecks({ checks }: { checks: CheckResult[] }) {
  return (
    <ul className="divide-y divide-border">
      {checks.map((c) => (
        <li key={c.check.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
          <CheckStatusPill status={c.status} />
          <span className="font-mono text-xs text-muted-foreground">{c.check.id}</span>
          <span className="min-w-0 flex-1">{c.check.name}</span>
        </li>
      ))}
    </ul>
  )
}

type Step = { icon: typeof Flag; title: string; text: string; tone: "muted" | "danger" | "info" | "success" }

export function ExceptionTimeline({ issue, status, fixes, history }: { issue: Issue; status: IssueStatus; fixes: Fixes; history: RunResult[] }) {
  const tl = issueTimeline(issue, fixes)
  const latest = history[0]
  const stillOpen = latest.exceptions.some((e) => e.id === issue.id)
  const steps: Step[] = [
    { icon: CircleDot, title: `Transaction date ${formatShort(issue.date)}`, text: [issue.qboRef && `QuickBooks: ${issue.qboRef}`, issue.xeroRef && `Xero: ${issue.xeroRef}`].filter(Boolean).join(" · ") || "Recorded in the source systems", tone: "muted" },
    { icon: Radar, title: `Detected at run ${tl.detectedRun}`, text: `${formatDateTime(tl.detected)}. The AI QA engine flagged it with ${Math.round(issue.confidence * 100)}% confidence.`, tone: "danger" },
  ]
  if (tl.presentInRuns > 1)
    steps.push({
      icon: Flag,
      title: `Still present in ${tl.presentInRuns - 1} later run${tl.presentInRuns === 2 ? "" : "s"}`,
      text: stillOpen ? `Including the latest run ${latest.id} (${formatDateTime(latest.at)}).` : "Checked every 2 hours until it was fixed.",
      tone: "danger",
    })
  if (status === "in-review") steps.push({ icon: Clock3, title: "In review", text: "Someone is looking at it. The engine keeps checking every 2 hours.", tone: "info" })
  if (tl.markedResolvedAt) {
    steps.push({ icon: CheckCircle2, title: `Marked resolved ${formatDateTime(tl.markedResolvedAt)}`, text: "Marked in this demo session.", tone: "info" })
    const marked = tl.markedResolvedAt.getTime()
    const confirm = [...history].reverse().find((r) => r.at.getTime() >= marked && !r.exceptions.some((e) => e.id === issue.id))
    if (!stillOpen) steps.push({ icon: CheckCircle2, title: `Fix confirmed at run ${confirm?.id ?? latest.id}`, text: "The figures agree again, so the exception is closed.", tone: "success" })
    else steps.push({ icon: Clock3, title: "Waiting for the next run to confirm", text: `The next scheduled run at ${formatDateTime(nextRunAt())} checks the fix. Use Run now on the AI QA page to check straight away.`, tone: "info" })
  } else if (tl.resolvedAt) {
    steps.push({ icon: CheckCircle2, title: `Resolved ${formatDateTime(tl.resolvedAt)}`, text: `Fix confirmed at run ${runId(nextRunAt(tl.resolvedAt))}.`, tone: "success" })
  }

  const toneClass = { muted: "bg-muted text-muted-foreground", danger: "bg-destructive/10 text-destructive", info: "bg-primary/10 text-primary", success: "bg-success/10 text-success" }
  return (
    <ol className="space-y-0 p-5">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-24px)] w-px bg-border" aria-hidden />}
          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", toneClass[s.tone])}>
            <s.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="text-sm font-semibold">{s.title}</div>
            <div className="text-xs text-muted-foreground">{s.text}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function BackLinks() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <Link href="/qa" className="font-medium text-primary hover:underline">
        ← AI QA
      </Link>
      <Link href="/tracker?tab=exceptions" className="font-medium text-primary hover:underline">
        Tracker exceptions
      </Link>
    </div>
  )
}
