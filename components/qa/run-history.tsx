"use client"

import { CheckCircle2, Mail } from "lucide-react"
import { formatShort, formatTime, isoOf, todayISO } from "@/lib/clock"
import { QA_RECIPIENTS } from "@/lib/data/company"
import { fmtInt } from "@/lib/format"
import type { RunResult } from "@/lib/qa/types"

/** Small stacked bar: passed / warnings / failed, with the numbers as text */
function ResultBar({ run }: { run: RunResult }) {
  const { passed, warnings, failed, run: total } = run.counts
  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="bg-success" style={{ width: `${(passed / total) * 100}%` }} />
        <div className="bg-warning" style={{ width: `${(warnings / total) * 100}%` }} />
        <div className="bg-destructive" style={{ width: `${(failed / total) * 100}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums">
        {passed} pass · {warnings} warn · {failed} fail
      </span>
    </div>
  )
}

export function RunHistory({ runs }: { runs: RunResult[] }) {
  const today = todayISO()
  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Run history</div>
          <div className="text-xs text-muted-foreground">The last {runs.filter((r) => !r.manual).length} scheduled runs, 2 hours apart{runs.some((r) => r.manual) ? ", plus manual runs" : ""}. Each one was emailed.</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[880px]">
          <thead>
            <tr>
              <th>Run</th>
              <th>Checks</th>
              <th className="num">Open exceptions</th>
              <th className="num">New</th>
              <th className="num">Fixed</th>
              <th className="num">Records</th>
              <th className="num">Duration</th>
              <th>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, idx) => (
              <tr key={`${r.id}-${r.at.getTime()}`}>
                <td>
                  <div className="flex items-center gap-2 font-medium">
                    {isoOf(r.at) === today ? "Today" : formatShort(isoOf(r.at))}, {formatTime(r.at)}
                    {r.manual && <span className="pill-info">Manual</span>}
                    {idx === 0 && <span className="pill-muted">Latest</span>}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
                </td>
                <td>
                  <ResultBar run={r} />
                </td>
                <td className="num">
                  <span className="font-semibold">{r.exceptions.length}</span>
                  {r.bySeverity.high > 0 && <span className="ml-1 text-xs text-destructive">({r.bySeverity.high} high)</span>}
                </td>
                <td className="num">{r.newIssues.length ? <span title={r.newIssues.map((i) => i.id).join(", ")}>{r.newIssues.length}</span> : <span className="text-muted-foreground">0</span>}</td>
                <td className="num">{r.closedIssues.length ? <span className="font-semibold text-success" title={r.closedIssues.map((i) => i.id).join(", ")}>{r.closedIssues.length}</span> : <span className="text-muted-foreground">0</span>}</td>
                <td className="num">{fmtInt(r.records.total)}</td>
                <td className="num">{r.durationSec} s</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Emailed to {QA_RECIPIENTS.length}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
