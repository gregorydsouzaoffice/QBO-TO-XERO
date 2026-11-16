"use client"

import { useMemo } from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, Landmark, Users, XCircle } from "lucide-react"
import { QuickBooksMark, XeroMark } from "@/components/brand"
import { useIssues } from "@/lib/demo-store"
import { dependencyLinks, dependencySources, HEALTH_LABEL, type DependencyLink, type DependencySource, type LinkHealth } from "@/lib/tracker/dependencies"
import { IssueLinks, Pill } from "./pills"
import { cn } from "@/lib/utils"

const LINE: Record<LinkHealth, string> = {
  healthy: "border-solid border-success",
  minor: "border-dashed border-warning",
  issue: "border-dashed border-destructive",
}
const ARROW: Record<LinkHealth, string> = { healthy: "text-success", minor: "text-warning", issue: "text-destructive" }
const TONE = { healthy: "success", minor: "warning", issue: "danger" } as const
const ICON = { healthy: CheckCircle2, minor: AlertTriangle, issue: XCircle }

export default function DependenciesTab() {
  const { list } = useIssues()
  const links = useMemo(() => dependencyLinks(list), [list])
  const sources = dependencySources()
  const count = (h: LinkHealth) => links.filter((l) => l.health === h).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {(["healthy", "minor", "issue"] as const).map((h) => {
          const Icon = ICON[h]
          return (
            <div key={h} className="panel flex items-center gap-3 p-4">
              <Icon className={cn("h-5 w-5", ARROW[h])} aria-hidden />
              <div>
                <div className="text-2xl font-bold tabular-nums">{count(h)}</div>
                <div className="text-xs text-muted-foreground">{h === "healthy" ? "Healthy links" : h === "minor" ? "Links with a minor issue" : "Links with an open issue"}</div>
              </div>
            </div>
          )
        })}
      </section>

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Source dependency map</div>
            <div className="text-xs text-muted-foreground">What feeds QuickBooks and Xero during the parallel run. A link turns healthy when its discrepancy is resolved.</div>
          </div>
          <Legend />
        </div>
        <div className="divide-y divide-border">
          {sources.map((s) => (
            <SourceRow key={s.key} source={s} links={links.filter((l) => l.source === s.key)} />
          ))}
        </div>
      </section>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {(["healthy", "minor", "issue"] as const).map((h) => (
        <span key={h} className="inline-flex items-center gap-1.5">
          <span className={cn("inline-block w-6 border-t-2", LINE[h])} aria-hidden />
          {HEALTH_LABEL[h]}
        </span>
      ))}
    </div>
  )
}

function SourceIcon({ s }: { s: DependencySource }) {
  if (s.system === "xero") return <XeroMark size={28} />
  if (s.system === "qbo") return <QuickBooksMark size={28} />
  const Icon = s.key === "amex" ? CreditCard : s.system === "people" ? Users : Landmark
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  )
}

function SourceRow({ source, links }: { source: DependencySource; links: DependencyLink[] }) {
  const worst: LinkHealth = links.some((l) => l.health === "issue") ? "issue" : links.some((l) => l.health === "minor") ? "minor" : "healthy"
  return (
    <div className="flex flex-col p-4 sm:flex-row sm:items-stretch sm:px-5">
      {/* Source box */}
      <div className="flex shrink-0 items-center sm:w-60">
        <div className={cn("flex w-full items-center gap-3 rounded-lg border-2 bg-card p-3", worst === "healthy" ? "border-border" : worst === "minor" ? "border-warning/60" : "border-destructive/60")}>
          <SourceIcon s={source} />
          <div className="min-w-0">
            <div className="font-semibold leading-tight">{source.name}</div>
            <div className="text-xs text-muted-foreground">{source.detail}</div>
          </div>
        </div>
      </div>
      {/* Stub from the source box to the spine */}
      <div className="hidden w-6 shrink-0 items-center sm:flex" aria-hidden>
        <span className="w-full border-t-2 border-border" />
      </div>
      {/* Branches */}
      <ul className="ml-6 mt-2 flex-1 border-l-2 border-border sm:ml-0 sm:mt-0">
        {links.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
            <div className="flex min-w-[150px] flex-1 flex-col">
              <span className="pl-3 text-xs font-medium text-foreground">{l.flow}</span>
              <span className="flex items-center" aria-hidden>
                <span className={cn("flex-1 border-t-2", LINE[l.health])} />
                <ArrowRight className={cn("-ml-1.5 h-4 w-4", ARROW[l.health])} />
              </span>
            </div>
            <Target target={l.target} />
            <Pill tone={TONE[l.health]} icon={ICON[l.health]}>
              {HEALTH_LABEL[l.health]}
            </Pill>
            <div className="flex basis-full flex-wrap items-center gap-2 pl-3 text-xs text-muted-foreground lg:basis-auto lg:flex-1">
              <span>{l.note}</span>
              <IssueLinks ids={l.issues.map((i) => i.id)} empty={null} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Target({ target }: { target: "qbo" | "xero" }) {
  return (
    <span className="inline-flex w-32 shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-sm font-semibold">
      {target === "qbo" ? <QuickBooksMark size={18} /> : <XeroMark size={18} />}
      {target === "qbo" ? "QuickBooks" : "Xero ledger"}
    </span>
  )
}
