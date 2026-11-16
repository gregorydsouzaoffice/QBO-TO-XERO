"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportPdf, reportsPdf } from "@/lib/export/pdf"
import { reportsXlsx } from "@/lib/export/xlsx"
import { fmtInt, fmtMoney } from "@/lib/format"
import type { Report, Table } from "@/lib/reports/types"
import { allMigrationReports, migrationCtx } from "@/lib/reports/migration"
import type { HistoryScope } from "@/lib/demo-store"
import { cn } from "@/lib/utils"
import { CheckPill } from "./step-shell"

const PREVIEW_ROWS = 10

/** The six comparative reports with on-screen preview, PDF and Excel downloads */
export default function MigrationReportList({ scope, gojeeEnabled }: { scope: HistoryScope; gojeeEnabled: boolean }) {
  const reports = useMemo(() => allMigrationReports(scope, gojeeEnabled), [scope, gojeeEnabled])
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }
  const ctx = () => migrationCtx(scope)
  const ref = ctx().reference

  return (
    <section className="panel" id="reports">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Comparative reports</div>
          <div className="text-xs text-muted-foreground">QuickBooks Online vs Xero, reference {ref}. The same figures on screen, in PDF and in Excel.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("all-pdf", () => reportsPdf(reports, ctx(), `${ref}-migration-reports.pdf`))}>
            {busy === "all-pdf" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            All as PDF
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run("all-xlsx", () => reportsXlsx(reports, ctx(), `${ref}-migration-reports.xlsx`))}>
            {busy === "all-xlsx" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
            All as Excel
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {reports.map((r) => {
          const isOpen = open === r.id
          return (
            <li key={r.id}>
              <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">{r.id}</span>
                      {r.status && <CheckPill status={r.status === "pass" ? "pass" : r.status === "fail" ? "fail" : r.status === "warning" ? "warning" : "info"} label={r.status === "pass" ? "All match" : r.status === "info" ? "Reference" : undefined} />}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{r.subtitle}</span>
                  </span>
                  <ChevronDown className={cn("ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run(`${r.id}-pdf`, () => reportPdf(r, ctx()))}>
                    {busy === `${r.id}-pdf` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run(`${r.id}-xlsx`, () => reportsXlsx([r], ctx(), `${ref}-${r.id}.xlsx`))}>
                    {busy === `${r.id}-xlsx` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />}
                    Excel
                  </Button>
                </div>
              </div>
              {isOpen && <ReportPreview report={r} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function cell(v: string | number | undefined, kind?: string) {
  if (v === undefined || v === "") return ""
  if (kind === "money" && typeof v === "number") return fmtMoney(v)
  if (kind === "int" && typeof v === "number") return fmtInt(v)
  if (kind === "pct" && typeof v === "number") return `${v.toFixed(1)}%`
  return String(v)
}

function PreviewTable({ t }: { t: Table }) {
  const rows = t.rows.slice(0, PREVIEW_ROWS)
  const num = (k?: string) => k === "money" || k === "int" || k === "pct"
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-sm font-semibold">{t.title}</div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {t.columns.map((c) => (
                <th key={c.key} className={cn(num(c.kind) && "num")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {t.columns.map((c) => (
                  <td key={c.key} className={cn(num(c.kind) && "num")}>
                    {c.kind === "status" ? <CheckPill status={/match/i.test(String(r[c.key])) ? "pass" : "fail"} label={String(r[c.key])} /> : cell(r[c.key], c.kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {t.footer && (
            <tfoot>
              <tr className="font-semibold">
                {t.columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-2.5", num(c.kind) && "text-right tabular-nums")}>
                    {cell(t.footer![c.key], c.kind)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {t.rows.length > PREVIEW_ROWS && <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">First {PREVIEW_ROWS} of {t.rows.length} rows. Download for the full table.</div>}
    </div>
  )
}

function ReportPreview({ report }: { report: Report }) {
  return (
    <div className="space-y-4 border-t border-border bg-muted/30 px-5 py-4">
      {report.headline && <p className="text-sm">{report.headline}</p>}
      {report.summary && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      {report.tables.map((t) => (
        <PreviewTable key={t.title} t={t} />
      ))}
      {report.notes?.map((n) => (
        <p key={n} className="text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </div>
  )
}
