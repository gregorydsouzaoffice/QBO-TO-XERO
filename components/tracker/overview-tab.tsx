"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, Banknote, Check, CheckCircle2, FileBarChart, GitBranch, ListChecks, Scale, ShieldAlert, Sigma, XCircle, type LucideIcon } from "lucide-react"
import { QuickBooksMark, XeroMark } from "@/components/brand"
import { Progress } from "@/components/ui/progress"
import { conversionDate, daysBetween, formatShort, formatTime, parallelRunDay, todayISO } from "@/lib/clock"
import { lastRunAt } from "@/lib/data/schedule"
import { feedStatuses } from "@/lib/data/bank"
import { useIssues } from "@/lib/demo-store"
import { healthAreas, type HealthArea } from "@/lib/tracker/health"
import { Pill } from "./pills"
import { cn } from "@/lib/utils"

const RECOMMENDED_DAYS = 60

const AREA_ICON: Record<HealthArea["key"], LucideIcon> = {
  bank: Banknote,
  figures: Sigma,
  reconciliation: Scale,
  dependencies: GitBranch,
  exceptions: ShieldAlert,
  reporting: FileBarChart,
  compare: ListChecks,
}

export default function OverviewTab() {
  const { list } = useIssues()
  const areas = useMemo(() => healthAreas(list), [list])
  const updated = formatTime(lastRunAt())

  return (
    <div className="space-y-6">
      <ParallelWindow />

      <section aria-labelledby="health-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="health-title" className="text-base font-semibold">
            Health by area
          </h2>
          <span className="text-xs text-muted-foreground">All areas updated {updated} today by the AI QA run</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {areas.map((a) => {
            const Icon = AREA_ICON[a.key]
            return (
              <Link key={a.key} href={`/tracker?tab=${a.key}`} scroll={false} className="panel group flex flex-col p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                    <Icon className="h-4 w-4" aria-hidden /> {a.title}
                  </span>
                  <Pill tone={a.tone}>{a.status}</Pill>
                </div>
                <div className="mt-2 text-lg font-bold tracking-tight">{a.metric}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.sub}</div>
                <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                  <span>Updated {updated}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:underline">
                    View <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            )
          })}
          <SwitchOff areas={areas} />
        </div>
      </section>
    </div>
  )
}

function ParallelWindow() {
  const { list } = useIssues()
  const start = conversionDate()
  const today = todayISO()
  const span = Math.max(1, daysBetween(start, today))
  const day = parallelRunDay()
  const markers = list.filter((i) => i.date >= start)
  const pos = (iso: string) => `${Math.min(100, Math.max(0, (daysBetween(start, iso) / span) * 100))}%`

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">Parallel-run window</div>
          <div className="text-xs text-muted-foreground">
            {formatShort(start)} (Xero go-live) to {formatShort(today)} · day {day}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <QuickBooksMark size={22} />
          <span className="text-xs text-muted-foreground">and</span>
          <XeroMark size={22} />
          <span className="text-xs text-muted-foreground">in parallel</span>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Progress value={Math.min(100, (day / RECOMMENDED_DAYS) * 100)} className="h-2 max-w-md flex-1" />
          <span className="text-xs text-muted-foreground">
            {Math.min(day, RECOMMENDED_DAYS)} of {RECOMMENDED_DAYS} recommended days
          </span>
        </div>

        {/* Timeline: each issue placed on the day it happened */}
        <div className="px-2">
          <div className="relative h-10" role="img" aria-label={`Timeline from ${formatShort(start)} to ${formatShort(today)} with ${markers.length} discrepancies marked`}>
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <div className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground" />
            <div className="absolute right-0 top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground" />
            {markers.map((i) => (
              <Link
                key={i.id}
                href={`/qa/exceptions/${i.id}`}
                title={`${i.id} · ${formatShort(i.date)} · ${i.title}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos(i.date) }}
              >
                <Marker kind={i.status === "resolved" ? "resolved" : i.severity} />
                <span className="sr-only">
                  {i.id}, {i.severity} severity, {i.status}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>{formatShort(start)}</span>
            <span>Today</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(["high", "medium", "low", "resolved"] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 capitalize">
              <Marker kind={k} /> {k}
            </span>
          ))}
          <span>· Hover or tap a dot to open the discrepancy</span>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Xero go-live" value={formatShort(start)} />
          <Fact label="Discrepancies found" value={`${markers.length} (${markers.filter((i) => i.status === "resolved").length} resolved)`} />
          <Fact label="Bank feeds" value={`${feedStatuses().filter((f) => f.status === "connected").length} of ${feedStatuses().length} feeding both systems`} />
          <Fact label="Last AI QA run" value={`${formatTime(lastRunAt())} today`} />
        </dl>
      </div>
    </section>
  )
}

/** Timeline marker: shape and colour both carry the meaning (diamond = high, square = medium, circle = low, tick = resolved) */
function Marker({ kind }: { kind: "high" | "medium" | "low" | "resolved" }) {
  if (kind === "resolved")
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-success text-white" aria-hidden>
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )
  return (
    <span
      aria-hidden
      className={cn(
        "block border-2 border-card",
        kind === "high" && "h-3.5 w-3.5 rotate-45 rounded-[2px] bg-destructive",
        kind === "medium" && "h-3.5 w-3.5 rounded-[2px] bg-warning",
        kind === "low" && "h-3.5 w-3.5 rounded-full bg-muted-foreground",
      )}
    />
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

/** What has to be true before QuickBooks can be switched off */
function SwitchOff({ areas }: { areas: HealthArea[] }) {
  const { list } = useIssues()
  const day = parallelRunDay()
  const by = (k: HealthArea["key"]) => areas.find((a) => a.key === k)!
  const checks = [
    { label: "Trial balances agree", ok: by("compare").tone === "success" },
    { label: "Bank balances agree", ok: by("reconciliation").tone === "success" },
    { label: "No high-severity discrepancies", ok: !list.some((i) => i.status !== "resolved" && i.severity === "high") },
    { label: "Every source link healthy", ok: by("dependencies").tone === "success" },
    { label: `${RECOMMENDED_DAYS} days of parallel run`, ok: day >= RECOMMENDED_DAYS },
  ]
  const done = checks.filter((c) => c.ok).length
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">Ready to switch off QuickBooks?</span>
        <Pill tone={done === checks.length ? "success" : "warning"}>{done === checks.length ? "Ready" : "Not yet"}</Pill>
      </div>
      <div className="mt-2 text-lg font-bold tracking-tight">
        {done} of {checks.length} checks met
      </div>
      <ul className="mt-2 space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden /> : <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />}
            <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
              {c.label}
              <span className="sr-only">{c.ok ? ": met" : ": not met"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
