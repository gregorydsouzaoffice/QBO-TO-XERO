"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatShort, fyStart, currentFy, todayISO, INCEPTION_DATE, type ViewKey } from "@/lib/clock"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "ytd", label: "Current YTD" },
  { key: "prior-fy", label: "Previous FY" },
  { key: "inception", label: "Since Inception" },
]

/**
 * Global reporting period. The three views are calculated from today's date
 * (Australian financial year), so they move on by themselves.
 */
export default function ViewSelector({ className, showCaption = true }: { className?: string; showCaption?: boolean }) {
  const { state, update, range } = useDemo()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(state.custom?.from ?? fyStart(currentFy()))
  const [to, setTo] = useState(state.custom?.to ?? todayISO())

  return (
    <div className={cn("flex flex-col items-start gap-1.5 sm:items-end", className)}>
      <div className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-card p-0.5 shadow-sm">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => update((s) => ({ ...s, view: v.key }))}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              state.view === v.key && "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                state.view === "custom" && "bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4" /> Custom
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="text-sm font-semibold">Custom period</div>
            <label className="block text-xs font-medium text-muted-foreground">
              From
              <input type="date" min={INCEPTION_DATE} max={todayISO()} value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm text-foreground" />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              To
              <input type="date" min={from} max={todayISO()} value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm text-foreground" />
            </label>
            <Button
              className="w-full"
              disabled={!from || !to || to < from}
              onClick={() => {
                update((s) => ({ ...s, view: "custom", custom: { from, to } }))
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </PopoverContent>
        </Popover>
      </div>
      {showCaption && (
        <p className="text-xs text-muted-foreground" suppressHydrationWarning>
          {formatShort(range.from)} – {formatShort(range.to)}
          {range.compare ? ` · compared with ${range.compare.label}` : " · full history"}
        </p>
      )}
    </div>
  )
}
