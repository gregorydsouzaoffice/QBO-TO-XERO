"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import ViewSelector from "@/components/shell/view-selector"
import LiveGate from "@/components/tracker/live-gate"
import ExportButtons from "@/components/reports/export-buttons"
import FyPanel from "@/components/reports/fy-panel"
import KpiTiles from "@/components/reports/kpi-tiles"
import SourceSwitch from "@/components/reports/source-switch"
import StatementTable from "@/components/reports/statement-table"
import TrendPanel from "@/components/reports/trend-panel"
import { conversionDate, formatShort } from "@/lib/clock"
import { COMPANY } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"
import { allReports, bsReport, bsStatement, exportName, plReport, plStatement, reportCtx, SOURCE_LABEL, type Source } from "@/lib/reports/financial"
import { differs } from "@/lib/tracker/explain"

const TITLE = "Financial reports"
const DESCRIPTION = "Profit and loss, balance sheet, trends and variances for the selected period, from Xero, QuickBooks or both side by side."

export default function ReportsPage() {
  return (
    <LiveGate title={TITLE} description={DESCRIPTION}>
      <Reports />
    </LiveGate>
  )
}

function Reports() {
  const { range } = useDemo()
  const [source, setSource] = useState<Source>("xero")
  const pl = useMemo(() => plStatement(range, source), [range, source])
  const bs = useMemo(() => bsStatement(range, source), [range, source])
  const conv = conversionDate()
  const inception = range.key === "inception"
  const npRow = pl.rows[pl.rows.length - 1]

  return (
    <>
      <PageHeader eyebrow={COMPANY.name} title={TITLE} description={DESCRIPTION} actions={<ViewSelector />} />
      <PageBody>
        <section className="panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <SourceSwitch value={source} onChange={setSource} />
            <p className="text-xs text-muted-foreground">
              {source === "compare"
                ? `QuickBooks and Xero side by side. History before ${formatShort(conv)} is identical in both; differences after it are explained in the tracker.`
                : `Showing ${SOURCE_LABEL[source]}. History before ${formatShort(conv)} is identical in QuickBooks and Xero.`}
            </p>
          </div>
          <ExportButtons label="All reports" build={() => ({ reports: allReports(range, source), ctx: reportCtx(range, source), name: exportName(range, source, "financial-reports") })} />
        </section>

        <KpiTiles range={range} source={source} />

        <TrendPanel range={range} source={source} />

        {inception && <FyPanel source={source} />}

        <div className="grid gap-6 2xl:grid-cols-2">
          <section className="panel min-w-0">
            <div className="panel-header flex-wrap">
              <div>
                <div className="panel-title">Profit and loss</div>
                <div className="text-xs text-muted-foreground">
                  {formatShort(range.from)} – {formatShort(range.to)}
                  {source !== "compare" && range.compare ? ` vs ${range.compare.label} (${formatShort(range.compare.from)} – ${formatShort(range.compare.to)})` : ""}
                  {source !== "compare" && range.compare ? " · for costs, an increase is unfavourable" : ""}
                </div>
              </div>
              <ExportButtons compact build={() => ({ reports: [plReport(range, source)], ctx: reportCtx(range, source), name: exportName(range, source, "profit-and-loss") })} />
            </div>
            <StatementTable st={pl} />
            {source === "compare" && differs(npRow.diff ?? 0) && (
              <p className="flex items-start gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Net profit differs between the systems. See which discrepancies explain each account in the{" "}
                <Link href="/tracker?tab=figures" className="text-primary hover:underline">
                  tracker
                </Link>
                .
              </p>
            )}
          </section>

          <section className="panel min-w-0">
            <div className="panel-header flex-wrap">
              <div>
                <div className="panel-title">Balance sheet</div>
                <div className="text-xs text-muted-foreground">{source === "compare" ? `At ${formatShort(range.to)}, QuickBooks vs Xero` : `${bs.aLabel} vs ${bs.bLabel}`}</div>
              </div>
              <ExportButtons compact build={() => ({ reports: [bsReport(range, source)], ctx: reportCtx(range, source), name: exportName(range, source, "balance-sheet") })} />
            </div>
            <StatementTable st={bs} />
          </section>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Every line shows its QuickBooks and Xero account codes, so each figure traces back to both ledgers. Exports contain the same figures as this page.
        </p>
      </PageBody>
    </>
  )
}
