"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, ChevronRight, Database, FileText, Flag, Loader2, Play, ScanSearch, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/clock"
import { QA_RECIPIENTS } from "@/lib/data/company"
import { fmtInt } from "@/lib/format"
import type { RunResult } from "@/lib/qa/types"
import { cn } from "@/lib/utils"

const STAGES = [
  { key: "collect", n: 1, label: "Data collection", text: "Fetch QuickBooks, Xero, bank feeds and Gojee", icon: Database, steps: ["QuickBooks Online", "Xero", "Bank and card feeds", "Gojee"] },
  { key: "validate", n: 2, label: "AI validation", text: "Figures, dependencies, reconciliations, inconsistencies", icon: ScanSearch, steps: ["Figures vs source", "Bank three-way match", "QuickBooks vs Xero", "Dependencies", "Entries", "Calculations"] },
  { key: "detect", n: 3, label: "Exception detection", text: "Flag items for human review", icon: Flag, steps: ["Comparing with the last run", "Scoring confidence", "Flagging manual review"] },
  { key: "report", n: 4, label: "Report generation", text: "Findings, evidence and recommendations", icon: FileText, steps: ["Summary", "Exceptions and evidence", "All checks", "Recommendations"] },
  { key: "deliver", n: 5, label: "Automated delivery", text: "Email the latest report every 2 hours", icon: Send, steps: QA_RECIPIENTS.map((r) => r.name) },
] as const

const STAGE_MS = 1100

type Phase = { kind: "idle" } | { kind: "running"; stage: number; step: number } | { kind: "done"; result: RunResult }

export function Pipeline({ latest, onRun, pausedReason }: { latest: RunResult; onRun: () => RunResult; pausedReason?: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const start = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    let t = 0
    STAGES.forEach((s, stage) => {
      const per = STAGE_MS / s.steps.length
      s.steps.forEach((_, step) => {
        timers.current.push(setTimeout(() => setPhase({ kind: "running", stage, step }), t))
        t += per
      })
    })
    timers.current.push(
      setTimeout(() => {
        const result = onRun()
        setPhase({ kind: "done", result })
        const high = result.bySeverity.high
        toast.success(`QA run ${result.id} finished`, {
          description: `${result.counts.run} checks · ${result.counts.failed} failed · ${result.exceptions.length} open exceptions${high ? ` (${high} high)` : ""}. Report emailed to ${QA_RECIPIENTS.length} recipients (simulated).`,
        })
      }, t),
    )
  }

  const running = phase.kind === "running"
  const metric = (key: string) => {
    if (key === "collect") return `${fmtInt(latest.records.total)} records`
    if (key === "validate") return `${latest.counts.run} checks`
    if (key === "detect") return `${latest.exceptions.length} exceptions · ${latest.needsReview.length} for review`
    if (key === "report") return "PDF and Excel"
    return `${QA_RECIPIENTS.length} recipients by email`
  }

  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Automated workflow</div>
          <div className="text-xs text-muted-foreground">Runs by itself every 2 hours. Run it now to check fixes straight away.</div>
        </div>
        <Button onClick={start} disabled={running || !!pausedReason} title={pausedReason}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running…" : "Run now"}
        </Button>
      </div>

      {pausedReason && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            {pausedReason}{" "}
            <Link href="/settings#connections" className="font-medium text-primary hover:underline">
              Reconnect in Settings
            </Link>
          </span>
        </div>
      )}

      <ol className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-2">
        {STAGES.map((s, i) => {
          const state = phase.kind === "running" ? (i < phase.stage ? "done" : i === phase.stage ? "active" : "waiting") : phase.kind === "done" ? "done" : "idle"
          const Icon = s.icon
          return (
            <li key={s.key} className="relative flex lg:block">
              <div
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 transition-colors lg:flex-col lg:gap-2",
                  state === "active" ? "border-primary bg-accent/60" : state === "done" ? "border-success/40 bg-success/5" : "border-border bg-card",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                      state === "active" ? "bg-primary text-white" : state === "done" ? "bg-success text-white" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {state === "active" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Step {s.n}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.text}</div>
                  <div className="mt-1.5 text-xs font-medium" aria-live="polite">
                    {state === "active" && phase.kind === "running" ? (
                      <span className="text-primary">{s.key === "deliver" ? "Sending to" : "Working on"} {s.steps[phase.step]}…</span>
                    ) : state === "done" ? (
                      <span className="text-success">Done</span>
                    ) : state === "waiting" ? (
                      <span className="text-muted-foreground">Waiting</span>
                    ) : (
                      <span className="text-foreground">{metric(s.key)}</span>
                    )}
                  </div>
                </div>
              </div>
              {i < STAGES.length - 1 && <ChevronRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground lg:block" aria-hidden />}
            </li>
          )
        })}
      </ol>

      {phase.kind === "done" && <RunResultBanner result={phase.result} onClose={() => setPhase({ kind: "idle" })} />}
    </section>
  )
}

function RunResultBanner({ result, onClose }: { result: RunResult; onClose: () => void }) {
  const bad = result.counts.failed > 0
  return (
    <div className={cn("mx-4 mb-4 flex items-start gap-3 rounded-lg border p-4 text-sm", bad ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5")} role="status">
      {bad ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />}
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          Manual run {result.id} finished at {formatTime(result.at)}
        </div>
        <p className="mt-0.5 text-muted-foreground">
          {result.counts.run} checks: {result.counts.passed} passed, {result.counts.warnings} warnings, {result.counts.failed} failed. {result.exceptions.length} open exceptions
          {result.newIssues.length ? `, ${result.newIssues.length} new` : ""}
          {result.closedIssues.length ? `, ${result.closedIssues.length} fix${result.closedIssues.length === 1 ? "" : "es"} confirmed (${result.closedIssues.map((i) => i.id).join(", ")})` : ""}. The report was emailed to {QA_RECIPIENTS.length} recipients (simulated).
        </p>
        <Link href="/qa/email" className="mt-1 inline-block font-medium text-primary hover:underline">
          See the email
        </Link>
      </div>
      <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
