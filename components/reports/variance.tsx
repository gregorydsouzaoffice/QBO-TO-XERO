import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { Delta } from "@/components/figures"
import type { Polarity } from "@/lib/reports/financial"
import { cn } from "@/lib/utils"

/** Delta chip that also supports "neutral" figures (no good/bad colouring) */
export function Variance({ current, previous, polarity, className }: { current: number; previous: number; polarity: Polarity; className?: string }) {
  if (polarity !== "neutral") return <Delta current={current} previous={previous} goodWhenUp={polarity === "up-good"} className={className} />
  if (!previous) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  return <PctChange value={((current - previous) / Math.abs(previous)) * 100} polarity="neutral" className={className} />
}

/** A percentage change already worked out (e.g. FY growth, CAGR) */
export function PctChange({ value, polarity = "up-good", className }: { value: number | null; polarity?: Polarity; className?: string }) {
  if (value === null || !isFinite(value)) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  const flat = Math.abs(value) < 0.05
  const up = value > 0
  const good = flat || polarity === "neutral" ? null : up === (polarity === "up-good")
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", good === null ? "text-muted-foreground" : good ? "text-success" : "text-destructive", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{flat ? "No change" : up ? "Up" : "Down"} </span>
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

/** Text colour for a money variance, from its sign and polarity */
export function varianceTone(diff: number, polarity: Polarity): string {
  if (polarity === "neutral" || Math.abs(diff) < 0.005) return ""
  return (diff > 0) === (polarity === "up-good") ? "text-success" : "text-destructive"
}
