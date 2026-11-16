import type { ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { fmtMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

/** $12,345.60 with tabular digits; negatives in brackets */
export function Money({ value, currency = true, className, whole = false }: { value: number; currency?: boolean; className?: string; whole?: boolean }) {
  const text = whole ? fmtWhole(value, currency) : fmtMoney(value, { currency })
  return <span className={cn("tabular-nums", className)}>{text}</span>
}

const wholeFmt = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 })
export function fmtWhole(value: number, currency = true): string {
  const abs = wholeFmt.format(Math.round(Math.abs(value)))
  const t = currency ? `$${abs}` : abs
  return value < 0 ? `(${t})` : t
}

/** $1.2m / $845k for chart axes and tiles */
export function fmtCompact(value: number): string {
  const a = Math.abs(value)
  const s = a >= 1_000_000 ? `$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}m` : a >= 1000 ? `$${Math.round(a / 1000)}k` : `$${Math.round(a)}`
  return value < 0 ? `−${s}` : s
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Variance chip. `goodWhenUp` = false for costs (an increase is shown amber/red).
 */
export function Delta({ current, previous, goodWhenUp = true, className }: { current: number; previous: number; goodWhenUp?: boolean; className?: string }) {
  const pct = pctChange(current, previous)
  if (pct === null || !isFinite(pct)) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  const flat = Math.abs(pct) < 0.05
  const up = pct > 0
  const good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive", className)}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

/** KPI tile */
export function StatTile({
  label,
  value,
  sub,
  icon,
  tone = "default",
  className,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: "default" | "success" | "warning" | "danger" | "info"
  className?: string
}) {
  const ring = { default: "", success: "border-l-success", warning: "border-l-warning", danger: "border-l-destructive", info: "border-l-primary" }[tone]
  return (
    <div className={cn("panel p-4", tone !== "default" && "border-l-4", ring, className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
