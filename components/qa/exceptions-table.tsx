"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Money } from "@/components/figures"
import { formatShort } from "@/lib/clock"
import { KIND_LABEL, SEVERITY_ORDER, type Issue, type IssueStatus } from "@/lib/data/issues"
import { cn } from "@/lib/utils"
import { ConfidenceMeter, IssueStatusPill, ReviewFlag, SeverityPill } from "./status"

type Filter = "open" | "review" | "all"

export function ExceptionsTable({ list, statusOf, isPending }: { list: Issue[]; statusOf: (i: Issue) => IssueStatus; isPending: (i: Issue) => boolean }) {
  const [filter, setFilter] = useState<Filter>("open")
  const rows = useMemo(() => {
    const sorted = [...list].sort((a, b) => {
      const ra = statusOf(a) === "resolved" ? 1 : 0
      const rb = statusOf(b) === "resolved" ? 1 : 0
      return ra - rb || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.amount - a.amount
    })
    if (filter === "open") return sorted.filter((i) => statusOf(i) !== "resolved" || isPending(i))
    if (filter === "review") return sorted.filter((i) => i.needsReview && statusOf(i) !== "resolved")
    return sorted
  }, [list, filter, statusOf, isPending])

  const counts = {
    open: list.filter((i) => statusOf(i) !== "resolved" || isPending(i)).length,
    review: list.filter((i) => i.needsReview && statusOf(i) !== "resolved").length,
    all: list.length,
  }

  return (
    <section className="panel" id="exceptions">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Exception report</div>
          <div className="text-xs text-muted-foreground">Every item the engine flagged, with its evidence. Open one to review and act on it.</div>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 text-sm" role="tablist">
          {(
            [
              ["open", "Open"],
              ["review", "Needs review"],
              ["all", "All"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
              className={cn("rounded-md px-3 py-1 font-medium", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {label} <span className="tabular-nums opacity-80">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th>Exception</th>
              <th>Severity</th>
              <th>Kind</th>
              <th>Area</th>
              <th className="num">Amount</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Needs review</th>
              <th aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nothing here.
                </td>
              </tr>
            )}
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="max-w-[340px]">
                  <Link href={`/qa/exceptions/${i.id}`} className="block">
                    <span className="block truncate font-medium text-foreground hover:text-primary">{i.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.id} · {formatShort(i.date)}
                    </span>
                  </Link>
                </td>
                <td>
                  <SeverityPill severity={i.severity} />
                </td>
                <td className="whitespace-nowrap">{KIND_LABEL[i.kind]}</td>
                <td className="whitespace-nowrap">{i.area}</td>
                <td className="num">{i.amount > 0 ? <Money value={i.amount} /> : <span className="text-muted-foreground">—</span>}</td>
                <td className="w-[150px]">
                  <ConfidenceMeter value={i.confidence} showLabel={false} />
                </td>
                <td>
                  <IssueStatusPill status={statusOf(i)} pending={isPending(i)} />
                </td>
                <td>
                  <ReviewFlag needsReview={i.needsReview} />
                </td>
                <td>
                  <Link href={`/qa/exceptions/${i.id}`} aria-label={`Open ${i.id}`} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
