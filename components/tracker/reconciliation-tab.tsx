"use client"

import { useMemo } from "react"
import { Info, Landmark, CreditCard } from "lucide-react"
import { SystemChip } from "@/components/brand"
import { Money } from "@/components/figures"
import { formatShort, todayISO } from "@/lib/clock"
import { useIssues } from "@/lib/demo-store"
import { reconciliation } from "@/lib/tracker/bank"
import { differs } from "@/lib/tracker/explain"
import { CodeTrace, IssueLinks, Pill } from "./pills"
import { cn } from "@/lib/utils"

export default function ReconciliationTab() {
  const { list } = useIssues()
  const rows = useMemo(() => reconciliation(list), [list])
  const today = todayISO()

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.code} className={cn("panel border-l-4 p-4", r.status.tone === "success" ? "border-l-success" : r.status.tone === "danger" ? "border-l-destructive" : r.status.tone === "warning" ? "border-l-warning" : "border-l-primary")}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {r.kind === "card" ? <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="truncate font-semibold">{r.name}</span>
              </span>
              <Pill tone={r.status.tone}>{r.status.label}</Pill>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {r.number} · <CodeTrace qbo={r.code} xero={r.xeroCode} />
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <Line label="Bank statement" value={r.statement} system="bank" />
              <Line label="QuickBooks" value={r.qbo} system="qbo" />
              <Line label="Xero" value={r.xero} system="xero" highlight={differs(r.diff)} />
            </dl>
            {differs(r.diff) && (
              <p className="mt-2 text-xs font-medium text-destructive">
                Xero is <Money value={Math.abs(r.diff)} /> {r.diff > 0 ? "higher" : "lower"} than the statement
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Reconciliation by account</div>
            <div className="text-xs text-muted-foreground">Balances at {formatShort(today)}. Card balances show the amount owing.</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1080px]">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">Statement</th>
                <th className="num">QuickBooks</th>
                <th className="num">Xero</th>
                <th className="num">Xero vs statement</th>
                <th className="num">Unreconciled in Xero</th>
                <th>Reconciled to</th>
                <th>Status</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.feed}</div>
                    <CodeTrace qbo={r.code} xero={r.xeroCode} />
                  </td>
                  <td className="num"><Money value={r.statement} /></td>
                  <td className="num"><Money value={r.qbo} /></td>
                  <td className="num"><Money value={r.xero} /></td>
                  <td className={cn("num", differs(r.diff) && "font-semibold text-destructive")}>{differs(r.diff) ? <Money value={r.diff} /> : "—"}</td>
                  <td className="num">
                    <div className="font-semibold">{r.unreconciled}</div>
                    <div className="whitespace-nowrap text-xs text-muted-foreground">
                      {r.stale ? `${r.stale} older than 7 days` : "none older than 7 days"}
                      {r.missing ? ` · ${r.missing} missing` : ""}
                      {r.duplicates ? ` · ${r.duplicates} duplicate` : ""}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-xs">
                    <div className="flex items-center gap-1.5"><SystemChip system="qbo" label={formatShort(r.qboThrough)} /></div>
                    <div className="mt-1 flex items-center gap-1.5"><SystemChip system="xero" label={formatShort(r.xeroThrough)} /></div>
                  </td>
                  <td><Pill tone={r.status.tone}>{r.status.label}</Pill></td>
                  <td><IssueLinks ids={r.issues.map((i) => i.id)} empty="None" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          In this demo the statement balance equals the QuickBooks book balance, because QuickBooks is fully reconciled. &ldquo;Reconciled to&rdquo; is the last day up to which every statement line is reconciled.
        </p>
      </section>
    </div>
  )
}

function Line({ label, value, system, highlight }: { label: string; value: number; system: "bank" | "qbo" | "xero"; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>
        <SystemChip system={system} label={label} />
      </dt>
      <dd className={cn("font-semibold tabular-nums", highlight && "text-destructive")}>
        <Money value={value} />
      </dd>
    </div>
  )
}
