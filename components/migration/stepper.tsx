"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { WIZARD_STEPS, stepHref } from "@/lib/data/migration"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

/**
 * The six migration steps across the top of every step page. Steps up to the
 * furthest one reached are links; later ones are not clickable yet.
 */
export default function MigrationStepper({ current }: { current: number }) {
  const { state } = useDemo()
  const furthest = state.migration.status === "completed" ? 6 : Math.max(state.migration.step, current)
  const done = (n: number) => state.migration.status === "completed" || n < furthest

  return (
    <nav aria-label="Migration steps" className="panel overflow-x-auto">
      <ol className="flex min-w-max items-stretch md:min-w-0">
        {WIZARD_STEPS.map((s, i) => {
          const isCurrent = s.n === current
          const isDone = !isCurrent && done(s.n)
          const reachable = s.n <= furthest
          const body = (
            <span className="flex items-center gap-2.5 px-3 py-3 md:px-4">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  isCurrent ? "bg-primary text-white" : isDone ? "bg-success text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.n}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", isCurrent ? "text-foreground" : reachable ? "text-foreground" : "text-muted-foreground")}>{s.title}</span>
                <span className="hidden text-xs text-muted-foreground xl:block">{s.text}</span>
              </span>
            </span>
          )
          return (
            <li key={s.slug} className={cn("relative flex-1", i > 0 && "border-l border-border", isCurrent && "bg-accent/50")} aria-current={isCurrent ? "step" : undefined}>
              {isCurrent && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />}
              {reachable && !isCurrent ? (
                <Link href={stepHref(s.n)} className="block h-full hover:bg-accent/40">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
