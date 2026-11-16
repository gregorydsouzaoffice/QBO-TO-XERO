import Link from "next/link"
import type { ReactNode } from "react"
import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot, Clock, Eye, Info, MinusCircle, XCircle, type LucideIcon } from "lucide-react"
import type { IssueStatus, Severity } from "@/lib/data/issues"
import type { MatchStatus } from "@/lib/data/bank"
import type { Tone } from "@/lib/tracker/bank"
import { MATCH_LABEL, MATCH_TONE } from "@/lib/tracker/bank"
import { differs } from "@/lib/tracker/explain"
import { cn } from "@/lib/utils"

/*
 * Status is always icon + text (never colour alone), using the pill-* classes
 * from globals.css.
 */

const TONE_CLASS: Record<Tone, string> = {
  success: "pill-success",
  warning: "pill-warning",
  danger: "pill-danger",
  info: "pill-info",
  muted: "pill-muted",
}

const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Clock,
  muted: MinusCircle,
}

export function Pill({ tone, icon, children, className, title }: { tone: Tone; icon?: LucideIcon; children: ReactNode; className?: string; title?: string }) {
  const Icon = icon ?? TONE_ICON[tone]
  return (
    <span className={cn(TONE_CLASS[tone], className)} title={title}>
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </span>
  )
}

export function AgreePill({ diff, agreeText = "Agrees", differText = "Differs" }: { diff: number; agreeText?: string; differText?: string }) {
  return differs(diff) ? <Pill tone="danger">{differText}</Pill> : <Pill tone="success">{agreeText}</Pill>
}

export function SeverityPill({ severity }: { severity: Severity }) {
  if (severity === "high") return <Pill tone="danger" icon={AlertOctagon}>High</Pill>
  if (severity === "medium") return <Pill tone="warning" icon={AlertTriangle}>Medium</Pill>
  return <Pill tone="muted" icon={Info}>Low</Pill>
}

export function IssueStatusPill({ status }: { status: IssueStatus }) {
  if (status === "resolved") return <Pill tone="success">Resolved</Pill>
  if (status === "in-review") return <Pill tone="info" icon={Eye}>In review</Pill>
  return <Pill tone="warning" icon={CircleDot}>Open</Pill>
}

export function MatchPill({ match }: { match: MatchStatus }) {
  return <Pill tone={MATCH_TONE[match]}>{MATCH_LABEL[match]}</Pill>
}

/** Issue IDs as links to the AI QA exception detail page */
export function IssueLinks({ ids, empty = "—", className }: { ids: string[]; empty?: ReactNode; className?: string }) {
  if (!ids.length) return <span className="text-xs text-muted-foreground">{empty}</span>
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {ids.map((id) => (
        <Link key={id} href={`/qa/exceptions/${id}`} className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary hover:border-primary/50 hover:underline">
          {id}
        </Link>
      ))}
    </span>
  )
}

/** "QBO 4010 ↔ Xero 200" trace label */
export function CodeTrace({ qbo, xero, className }: { qbo?: string; xero?: string; className?: string }) {
  if (!qbo && !xero) return null
  return (
    <span className={cn("whitespace-nowrap font-mono text-[11px] text-muted-foreground", className)}>
      QBO {qbo || "—"} ↔ Xero {xero || "—"}
    </span>
  )
}
