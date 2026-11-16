"use client"

import { useState } from "react"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportsPdf } from "@/lib/export/pdf"
import { reportsXlsx } from "@/lib/export/xlsx"
import type { Report, ReportCtx } from "@/lib/reports/types"
import { cn } from "@/lib/utils"

export interface ExportJob {
  reports: Report[]
  ctx: ReportCtx
  /** File name without extension */
  name: string
}

/** "PDF" and "Excel" buttons. `build` runs on click so the export uses the figures on screen at that moment. */
export default function ExportButtons({ build, className, compact = false, label }: { build: () => ExportJob; className?: string; compact?: boolean; label?: string }) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: "pdf" | "xlsx") {
    setBusy(kind)
    setError(null)
    try {
      const job = build()
      if (kind === "pdf") await reportsPdf(job.reports, job.ctx, `${job.name}.pdf`)
      else await reportsXlsx(job.reports, job.ctx, `${job.name}.xlsx`)
    } catch {
      setError("Export failed. Try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <Button variant="outline" size="sm" onClick={() => run("pdf")} disabled={busy !== null} aria-label={compact ? "Export to PDF" : undefined}>
        {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />}
        {compact ? "PDF" : "Export PDF"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => run("xlsx")} disabled={busy !== null} aria-label={compact ? "Export to Excel" : undefined}>
        {busy === "xlsx" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
        {compact ? "Excel" : "Export Excel"}
      </Button>
      {error && (
        <span role="alert" className="text-xs font-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
