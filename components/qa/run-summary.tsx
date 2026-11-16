"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, Mail, Sparkles, UserCheck, XCircle } from "lucide-react"
import { Money, StatTile } from "@/components/figures"
import { formatDateTime, formatTime } from "@/lib/clock"
import { QA_RECIPIENTS } from "@/lib/data/company"
import { nextRunAt, untilNextRun } from "@/lib/data/schedule"
import { fmtInt } from "@/lib/format"
import type { RunResult } from "@/lib/qa/types"
import { SeverityPill } from "./status"

export function RunSummary({ run }: { run: RunResult }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">
          Latest run · {run.id}
          {run.manual && <span className="pill-info ml-2 align-middle">Manual</span>}
        </h2>
        <span className="text-xs text-muted-foreground">
          {formatDateTime(run.at)} · {fmtInt(run.records.total)} records in {run.durationSec} s · confidence {(run.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Checks run" value={run.counts.run} icon={<ListChecks className="h-4 w-4" />} sub="Across six responsibility areas" />
        <StatTile label="Passed" value={run.counts.passed} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" sub={`${Math.round((run.counts.passed / run.counts.run) * 100)}% of checks`} />
        <StatTile label="Warnings" value={run.counts.warnings} icon={<AlertTriangle className="h-4 w-4" />} tone={run.counts.warnings ? "warning" : "default"} sub="Low-severity differences" />
        <StatTile label="Failed" value={run.counts.failed} icon={<XCircle className="h-4 w-4" />} tone={run.counts.failed ? "danger" : "success"} sub="Linked to high or medium exceptions" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Exceptions by severity</div>
            <span className="text-sm font-semibold tabular-nums">
              {run.exceptions.length} open · <Money value={run.exceptionValue} whole />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {(["high", "medium", "low"] as const).map((s) => {
              const list = run.exceptions.filter((i) => i.severity === s)
              return (
                <div key={s} className="rounded-lg border border-border p-3">
                  <SeverityPill severity={s} />
                  <div className="mt-2 text-2xl font-bold tabular-nums">{list.length}</div>
                  <div className="text-xs text-muted-foreground">
                    <Money value={list.reduce((t, i) => t + i.amount, 0)} whole />
                  </div>
                </div>
              )
            })}
          </div>
          {(run.newIssues.length > 0 || run.closedIssues.length > 0) && (
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Since the previous run:{" "}
              {run.newIssues.length > 0 && (
                <span>
                  <span className="font-semibold text-foreground">{run.newIssues.length} new</span> ({run.newIssues.map((i) => i.id).join(", ")})
                </span>
              )}
              {run.newIssues.length > 0 && run.closedIssues.length > 0 && " · "}
              {run.closedIssues.length > 0 && (
                <span>
                  <span className="font-semibold text-success">{run.closedIssues.length} fixed</span> ({run.closedIssues.map((i) => i.id).join(", ")})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Needs manual intervention
            </div>
            <span className="text-sm font-semibold tabular-nums">{run.needsReview.length}</span>
          </div>
          {run.needsReview.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nothing needs a decision. Remaining items can be fixed by the accounts team in Xero.</p>
          ) : (
            <ul className="divide-y divide-border">
              {run.needsReview.map((i) => (
                <li key={i.id}>
                  <Link href={`/qa/exceptions/${i.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50">
                    <SeverityPill severity={i.severity} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.title}</span>
                      <span className="text-xs text-muted-foreground">{i.id} · {i.area}</span>
                    </span>
                    {i.amount > 0 && <Money value={i.amount} className="text-sm" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/** Schedule: every 2 hours, last run, live countdown to the next, delivery list */
export function ScheduleCard({ latest, paused }: { latest: RunResult; paused?: boolean }) {
  const [countdown, setCountdown] = useState(() => untilNextRun())
  const [next, setNext] = useState(() => nextRunAt())
  useEffect(() => {
    const tick = () => {
      setCountdown(untilNextRun())
      setNext(nextRunAt())
    }
    const id = setInterval(tick, 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="panel flex flex-col">
      <div className="panel-header">
        <div className="panel-title flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Schedule
        </div>
        {paused ? (
          <span className="pill-warning">
            <AlertTriangle className="h-3 w-3" /> Paused
          </span>
        ) : (
          <span className="pill-success">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Frequency</dt>
          <dd className="font-semibold">Every 2 hours</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Last run</dt>
          <dd className="font-semibold">{formatTime(latest.at)}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-accent/50 p-3">
          <dt className="text-xs text-muted-foreground">Next run</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl font-bold tabular-nums">{formatTime(next)}</span>
            <span className="text-sm text-muted-foreground">in {countdown}</span>
          </dd>
        </div>
      </dl>
      <div className="border-t border-border px-5 py-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Mail className="h-3.5 w-3.5" /> Report emailed after every run to
        </div>
        <ul className="space-y-1.5">
          {QA_RECIPIENTS.map((r) => (
            <li key={r.email} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium">{r.name}</span> <span className="text-muted-foreground">· {r.role}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/qa/email" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Sparkles className="h-3.5 w-3.5" /> Preview the latest email
          </Link>
          <Link href="/settings#qa" className="font-medium text-primary hover:underline">
            Change recipients
          </Link>
        </div>
      </div>
    </section>
  )
}
