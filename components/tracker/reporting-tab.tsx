"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"
import { Money } from "@/components/figures"
import { conversionDate, formatShort } from "@/lib/clock"
import { useIssues } from "@/lib/demo-store"
import { AGREEMENT_LABEL, monthEndClose, standardReports, type Agreement, type Cell } from "@/lib/tracker/reporting"
import { differs } from "@/lib/tracker/explain"
import { IssueLinks, Pill } from "./pills"
import { cn } from "@/lib/utils"

const AGREE_TONE: Record<Agreement, "success" | "warning" | "danger"> = { agrees: "success", partly: "warning", differs: "danger" }
const AGREE_ICON = { agrees: CheckCircle2, partly: AlertTriangle, differs: XCircle }

export default function ReportingTab() {
  const { list } = useIssues()
  const reports = useMemo(() => standardReports(list), [list])
  const close = useMemo(() => monthEndClose(list), [list])

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Standard reports: QuickBooks vs Xero</div>
            <div className="text-xs text-muted-foreground">Each report run in both systems today and compared. Difference = Xero minus QuickBooks.</div>
          </div>
          <Link href="/reports" className="text-sm font-medium text-primary hover:underline">
            Open financial reports
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[980px]">
            <thead>
              <tr>
                <th>Report</th>
                <th>Figure compared</th>
                <th className="num">QuickBooks</th>
                <th className="num">Xero</th>
                <th className="num">Difference</th>
                <th>Result</th>
                <th>Explained by</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.key}>
                  <td>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.basis}</div>
                  </td>
                  <td className="text-sm">{r.measure}</td>
                  <td className="num"><Money value={r.qbo} /></td>
                  <td className="num"><Money value={r.xero} /></td>
                  <td className={cn("num", differs(r.diff) && "font-semibold text-destructive")}>{differs(r.diff) ? <Money value={r.diff} /> : "—"}</td>
                  <td>
                    <Pill tone={AGREE_TONE[r.agreement]} icon={AGREE_ICON[r.agreement]}>
                      {AGREEMENT_LABEL[r.agreement]}
                    </Pill>
                    <div className="mt-1 text-xs text-muted-foreground">{r.detail}</div>
                  </td>
                  <td><IssueLinks ids={r.issues.map((i) => i.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Month-end close</div>
            <div className="text-xs text-muted-foreground">
              Last financial year and this one. Months from {formatShort(conversionDate())} are in the parallel run; earlier months were migrated.
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1040px]">
            <thead>
              <tr>
                <th>Month</th>
                <th>QuickBooks closed?</th>
                <th>Xero bank reconciled?</th>
                <th>Trial balance agrees?</th>
                <th>GST / BAS quarter</th>
              </tr>
            </thead>
            <tbody>
              {close.map((m) => (
                <tr key={m.period} className={cn(m.phase === "parallel" && "bg-accent/30")}>
                  <td className="whitespace-nowrap">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.current ? "Current month" : m.phase === "parallel" ? "Parallel run" : "Migrated history"}</div>
                  </td>
                  <td><StatusCell c={m.qbo} /></td>
                  <td><StatusCell c={m.xero} /></td>
                  <td><StatusCell c={m.tb} /></td>
                  <td>
                    <div className="mb-1 text-xs font-medium">{m.bas.quarter}</div>
                    <StatusCell c={m.bas} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusCell({ c }: { c: Cell }) {
  return (
    <div>
      <Pill tone={c.tone}>{c.label}</Pill>
      {c.detail && <div className="mt-1 text-xs text-muted-foreground">{c.detail}</div>}
    </div>
  )
}
