import { AlertOctagon, AlertTriangle, CheckCircle2, CircleDot, Clock3, Info, UserCheck, XCircle } from "lucide-react"
import type { IssueStatus, Severity } from "@/lib/data/issues"
import type { CheckStatus } from "@/lib/qa/types"
import { cn } from "@/lib/utils"

/** Status is always icon + text, never colour alone */

export function SeverityPill({ severity, className }: { severity: Severity; className?: string }) {
  if (severity === "high")
    return (
      <span className={cn("pill-danger", className)}>
        <AlertOctagon className="h-3 w-3" /> High
      </span>
    )
  if (severity === "medium")
    return (
      <span className={cn("pill-warning", className)}>
        <AlertTriangle className="h-3 w-3" /> Medium
      </span>
    )
  return (
    <span className={cn("pill-muted", className)}>
      <Info className="h-3 w-3" /> Low
    </span>
  )
}

export function IssueStatusPill({ status, pending, className }: { status: IssueStatus; pending?: boolean; className?: string }) {
  if (status === "resolved")
    return (
      <span className={cn(pending ? "pill-info" : "pill-success", className)} title={pending ? "Marked resolved; the next QA run confirms the fix" : undefined}>
        {pending ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {pending ? "Resolved · confirming" : "Resolved"}
      </span>
    )
  if (status === "in-review")
    return (
      <span className={cn("pill-info", className)}>
        <UserCheck className="h-3 w-3" /> In review
      </span>
    )
  return (
    <span className={cn("pill-warning", className)}>
      <CircleDot className="h-3 w-3" /> Open
    </span>
  )
}

export function CheckStatusPill({ status, className }: { status: CheckStatus; className?: string }) {
  if (status === "pass")
    return (
      <span className={cn("pill-success", className)}>
        <CheckCircle2 className="h-3 w-3" /> Pass
      </span>
    )
  if (status === "warn")
    return (
      <span className={cn("pill-warning", className)}>
        <AlertTriangle className="h-3 w-3" /> Warning
      </span>
    )
  return (
    <span className={cn("pill-danger", className)}>
      <XCircle className="h-3 w-3" /> Fail
    </span>
  )
}

export function ReviewFlag({ needsReview }: { needsReview: boolean }) {
  return needsReview ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
      <UserCheck className="h-3.5 w-3.5 text-primary" /> Yes
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">No</span>
  )
}

/** Horizontal confidence bar with the percentage as text */
export function ConfidenceMeter({ value, className, showLabel = true }: { value: number; className?: string; showLabel?: boolean }) {
  const pct = Math.round(value * 100)
  const label = pct >= 95 ? "Very high" : pct >= 85 ? "High" : pct >= 70 ? "Moderate" : "Low"
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-full bg-muted" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Confidence">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums">{pct}%</span>
      {showLabel && <span className="shrink-0 text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}
