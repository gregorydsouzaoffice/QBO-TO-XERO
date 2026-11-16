"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { Money } from "@/components/figures"
import ViewSelector from "@/components/shell/view-selector"
import ExportButtons from "@/components/reports/export-buttons"
import { conversionDate, formatShort } from "@/lib/clock"
import { useDemo, useIssues } from "@/lib/demo-store"
import { exportName, plReport, plStatement, reportCtx } from "@/lib/reports/financial"
import { differs, explain } from "@/lib/tracker/explain"
import { AgreePill, CodeTrace, IssueLinks } from "./pills"
import { cn } from "@/lib/utils"

export default function FiguresTab() {
  const { range } = useDemo()
  const { list } = useIssues()
  const [onlyDiff, setOnlyDiff] = useState(false)
  const st = useMemo(() => plStatement(range, "compare"), [range])
  const conv = conversionDate()
  const touchesParallel = range.to >= conv

  const totals = ["Total trading income", "Gross profit", "Total operating expenses", "Net profit"].map((label) => st.rows.find((r) => r.label === label)!).filter(Boolean)
  const diffCount = st.rows.filter((r) => r.kind === "account" && differs(r.diff ?? 0)).length
  const rows = onlyDiff ? st.rows.filter((r) => r.kind !== "account" || differs(r.diff ?? 0)) : st.rows

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-semibold">Profit and loss, QuickBooks vs Xero · {range.label}</div>
          <p className="text-sm text-muted-foreground">Uses the reporting period selected at the top of every page. {diffCount ? `${diffCount} accounts differ.` : "Every account agrees."}</p>
        </div>
        <ViewSelector />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals.map((t) => (
          <div key={t.label} className={cn("panel border-l-4 p-4", differs(t.diff ?? 0) ? "border-l-destructive" : "border-l-success")}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">{t.label.replace("Total ", "").replace(/^./, (c) => c.toUpperCase())}</span>
              <AgreePill diff={t.diff ?? 0} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 text-sm">
              <dt className="text-muted-foreground">QuickBooks</dt>
              <dd className="text-right font-semibold"><Money value={t.a} /></dd>
              <dt className="text-muted-foreground">Xero</dt>
              <dd className="text-right font-semibold"><Money value={t.b ?? 0} /></dd>
              <dt className="text-muted-foreground">Difference</dt>
              <dd className={cn("text-right font-semibold", differs(t.diff ?? 0) && "text-destructive")}><Money value={t.diff ?? 0} /></dd>
            </dl>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">By account</div>
            <div className="text-xs text-muted-foreground">
              {formatShort(range.from)} – {formatShort(range.to)} · difference = Xero minus QuickBooks
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              Only differences
            </label>
            <ExportButtons compact build={() => ({ reports: [plReport(range, "compare")], ctx: reportCtx(range, "compare"), name: exportName(range, "compare", "pl-qbo-vs-xero") })} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">QuickBooks</th>
                <th className="num">Xero</th>
                <th className="num">Difference</th>
                <th>Status</th>
                <th>Explained by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                if (r.kind === "heading")
                  return (
                    <tr key={`h-${idx}`} className="bg-muted/30 hover:bg-muted/30">
                      <td colSpan={6} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {r.label}
                      </td>
                    </tr>
                  )
                const d = r.diff ?? 0
                const exp = r.kind === "account" && r.code ? explain(r.code, list, range.from, range.to) : null
                const bold = r.kind !== "account"
                return (
                  <tr key={`${r.label}-${idx}`} className={cn(bold && "font-semibold", r.kind === "total" && "bg-accent/40")}>
                    <td>
                      <div>{r.label}</div>
                      {r.code && (
                        <div className="text-xs">
                          <CodeTrace qbo={r.code} xero={r.xeroCode} />
                          {r.xeroName && r.xeroName !== r.label && <span className="text-muted-foreground"> · Xero: {r.xeroName}</span>}
                        </div>
                      )}
                    </td>
                    <td className="num"><Money value={r.a} /></td>
                    <td className="num"><Money value={r.b ?? 0} /></td>
                    <td className={cn("num", differs(d) && "font-semibold text-destructive")}>{differs(d) ? <Money value={d} /> : "—"}</td>
                    <td><AgreePill diff={d} /></td>
                    <td>{exp ? <IssueLinks ids={exp.issues.map((i) => i.id)} empty={differs(d) ? "Not yet explained" : "—"} /> : null}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="flex items-start gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {touchesParallel
            ? `History before ${formatShort(conv)} was migrated and agrees in both systems; differences come from transactions since go-live.`
            : `This period ends before Xero went live (${formatShort(conv)}). It was migrated from QuickBooks, so both systems agree.`}
        </p>
      </section>
    </div>
  )
}
