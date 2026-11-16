"use client"

import Link from "next/link"
import { TRACKER_TABS, type TrackerTab } from "@/lib/tracker/health"
import { cn } from "@/lib/utils"

/** Tab strip under the page header. Scrolls sideways on small screens. */
export default function TrackerTabs({ active, badges }: { active: TrackerTab; badges?: Partial<Record<TrackerTab, number>> }) {
  return (
    <nav aria-label="Tracker sections" className="border-b border-border bg-card">
      <div className="mx-auto max-w-[1400px] overflow-x-auto px-4 md:px-6">
        <ul className="flex min-w-max gap-1">
          {TRACKER_TABS.map((t) => {
            const on = t.key === active
            const badge = badges?.[t.key]
            return (
              <li key={t.key}>
                <Link
                  href={t.key === "overview" ? "/tracker" : `/tracker?tab=${t.key}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                    on ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {t.label}
                  {badge ? (
                    <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")} aria-label={`${badge} to review`}>
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
