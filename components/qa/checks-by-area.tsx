"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { SystemChip } from "@/components/brand"
import { Money } from "@/components/figures"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { fmtInt } from "@/lib/format"
import { AREAS } from "@/lib/qa/checks"
import { varianceText } from "@/lib/qa/report"
import type { CheckResult, Measure, MeasureRow, RunResult } from "@/lib/qa/types"
import { cn } from "@/lib/utils"
import { CheckStatusPill, SeverityPill } from "./status"

export function ChecksByArea({ run }: { run: RunResult }) {
  const firstFailing = AREAS.find((a) => run.checks.some((c) => c.check.area === a.key && c.status !== "pass"))?.key
  const [open, setOpen] = useState<Record<string, boolean>>(firstFailing ? { [firstFailing]: true } : {})

  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Checks by responsibility area</div>
          <div className="text-xs text-muted-foreground">What the engine compared at {run.id}, the sources it read and the result. Open a check to see the figures.</div>
        </div>
        <button className="text-sm font-medium text-primary hover:underline" onClick={() => setOpen(Object.fromEntries(AREAS.map((a) => [a.key, !AREAS.every((x) => open[x.key])])))}>
          {AREAS.every((a) => open[a.key]) ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="divide-y divide-border">
        {AREAS.map((a) => {
          const checks = run.checks.filter((c) => c.check.area === a.key)
          const failed = checks.filter((c) => c.status === "fail").length
          const warned = checks.filter((c) => c.status === "warn").length
          const passed = checks.length - failed - warned
          return (
            <Collapsible key={a.key} open={!!open[a.key]} onOpenChange={(v) => setOpen((o) => ({ ...o, [a.key]: v }))}>
              <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left hover:bg-accent/40">
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open[a.key] && "rotate-180")} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.responsibility}</span>
                  <span className="block text-xs text-muted-foreground">{a.description}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 pl-8 sm:pl-0">
                  <span className="text-xs text-muted-foreground">{checks.length} checks</span>
                  {passed > 0 && (
                    <span className="pill-success">
                      <CheckCircle2 className="h-3 w-3" /> {passed} passed
                    </span>
                  )}
                  {warned > 0 && (
                    <span className="pill-warning">
                      <AlertTriangle className="h-3 w-3" /> {warned} warning{warned === 1 ? "" : "s"}
                    </span>
                  )}
                  {failed > 0 && (
                    <span className="pill-danger">
                      <XCircle className="h-3 w-3" /> {failed} failed
                    </span>
                  )}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="divide-y divide-border border-t border-border bg-muted/20">
                  {checks.map((c) => (
                    <CheckRow key={c.check.id} result={c} />
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>
    </section>
  )
}

function CheckRow({ result }: { result: CheckResult }) {
  const [open, setOpen] = useState(false)
  const { check, status, issues, measure } = result
  return (
    <li>
      <button className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-left hover:bg-accent/40 sm:pl-12" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <CheckStatusPill status={status} className="w-[84px] justify-center" />
        <span className="w-[64px] shrink-0 font-mono text-xs text-muted-foreground">{check.id}</span>
        <span className="min-w-0 flex-1 text-sm font-medium">{check.name}</span>
        <span className="flex items-center gap-3 pl-[92px] sm:pl-0">
          {status !== "pass" && <span className="text-sm font-semibold tabular-nums">{varianceText(result)}</span>}
          {issues.length > 0 && <span className="text-xs text-muted-foreground">{issues.map((i) => i.id).join(", ")}</span>}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="space-y-3 px-5 pb-4 sm:pl-12">
          <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto]">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">What it compares</div>
              <p>{check.compares}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Sources</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {check.sources.map((s) => (
                  <SystemChip key={s} system={s} label={s === "bank" ? check.sourceLabel ?? "Bank statement" : undefined} />
                ))}
              </div>
            </div>
          </div>
          {measure && <MeasureTable measure={measure} sourceLabel={check.sourceLabel} />}
          {measure && <p className="text-sm">{measure.detail}</p>}
          {issues.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground">Linked exceptions</div>
              <ul className="mt-1 space-y-1">
                {issues.map((i) => (
                  <li key={i.id}>
                    <Link href={`/qa/exceptions/${i.id}`} className="inline-flex flex-wrap items-center gap-2 text-sm hover:underline">
                      <SeverityPill severity={i.severity} />
                      <span className="font-medium text-primary">{i.id}</span> {i.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function Value({ v, kind }: { v: MeasureRow["qbo"]; kind?: MeasureRow["kind"] }) {
  if (v === undefined) return <span className="text-muted-foreground">—</span>
  if (typeof v === "number") return kind === "money" ? <Money value={v} /> : <span className="tabular-nums">{fmtInt(v)}</span>
  return <span>{v}</span>
}

export function MeasureTable({ measure, sourceLabel }: { measure: Measure; sourceLabel?: string }) {
  const has = (k: "qbo" | "xero" | "source") => measure.rows.some((r) => r[k] !== undefined)
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Measure</th>
            {has("qbo") && <th className="num">QuickBooks</th>}
            {has("xero") && <th className="num">Xero</th>}
            {has("source") && <th className="num">{sourceLabel ?? "Source"}</th>}
          </tr>
        </thead>
        <tbody>
          {measure.rows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              {has("qbo") && (
                <td className="num">
                  <Value v={r.qbo} kind={r.kind} />
                </td>
              )}
              {has("xero") && (
                <td className="num">
                  <Value v={r.xero} kind={r.kind} />
                </td>
              )}
              {has("source") && (
                <td className="num">
                  <Value v={r.source} kind={r.kind} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
