"use client"

import { useMemo, useState } from "react"
import { TrendChart, type SeriesDef } from "@/components/charts"
import { Money } from "@/components/figures"
import ExportButtons from "./export-buttons"
import { CHART_COLOURS } from "@/lib/brand"
import type { DateRange } from "@/lib/clock"
import { exportName, reportCtx, SOURCE_LABEL, TREND_METRIC_LABEL, trendReport, trendRows, type Source, type TrendMetric } from "@/lib/reports/financial"
import { cn } from "@/lib/utils"
import { PctChange } from "./variance"

export default function TrendPanel({ range, source }: { range: DateRange; source: Source }) {
  const [metric, setMetric] = useState<TrendMetric>("income")
  const rows = useMemo(() => trendRows(range, source), [range, source])
  const system = source === "compare"

  const data = rows.map((r) => ({ label: r.label, a: r.a[metric], ...(r.b ? { b: r.b[metric] } : {}) }))
  // Colour follows the system: Xero blue, QuickBooks green; comparison period is dashed grey
  const series: SeriesDef[] = system
    ? [
        { key: "b", label: "Xero", colour: CHART_COLOURS.xero },
        { key: "a", label: "QuickBooks", colour: CHART_COLOURS.qbo },
      ]
    : [
        { key: "a", label: `${range.short} · ${SOURCE_LABEL[source]}`, colour: source === "qbo" ? CHART_COLOURS.qbo : CHART_COLOURS.xero },
        ...(range.compare ? [{ key: "b", label: range.compare.label, dashed: true }] : []),
      ]

  const values = rows.map((r) => (system && r.b ? r.b[metric] : r.a[metric]))
  const avg = values.length ? values.reduce((t, v) => t + v, 0) / values.length : 0
  const bestIdx = values.reduce((bi, v, i) => (v > values[bi] ? i : bi), 0)
  const cur = rows.reduce((t, r) => t + r.a[metric], 0)
  const prev = rows.reduce((t, r) => t + (r.b ? r.b[metric] : 0), 0)

  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Monthly trend</div>
          <div className="text-xs text-muted-foreground">
            {range.label} · {system ? "QuickBooks and Xero" : SOURCE_LABEL[source]}
            {!system && range.compare ? `, compared with ${range.compare.label}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Measure" className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(Object.keys(TREND_METRIC_LABEL) as TrendMetric[]).map((m) => (
              <button key={m} role="radio" aria-checked={metric === m} onClick={() => setMetric(m)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground", metric === m && "bg-secondary text-secondary-foreground")}>
                {TREND_METRIC_LABEL[m]}
              </button>
            ))}
          </div>
          <ExportButtons compact build={() => ({ reports: [trendReport(range, source)], ctx: reportCtx(range, source), name: exportName(range, source, "monthly-trend") })} />
        </div>
      </div>
      <div className="p-4">
        <TrendChart data={data} series={series} height={280} />
      </div>
      <dl className="grid gap-3 border-t border-border px-5 py-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Average per month</dt>
          <dd className="font-semibold"><Money value={avg} whole /></dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Best month</dt>
          <dd className="font-semibold">{rows[bestIdx] ? <>{rows[bestIdx].label} · <Money value={values[bestIdx]} whole /></> : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{system ? "Xero vs QuickBooks, whole period" : range.compare ? `Total vs ${range.compare.label}` : "Months shown"}</dt>
          <dd className="flex items-center gap-2 font-semibold">
            {system ? <Money value={prev - cur} /> : range.compare ? <><Money value={cur} whole /> <PctChange value={prev ? ((cur - prev) / Math.abs(prev)) * 100 : null} polarity="up-good" /></> : rows.length}
          </dd>
        </div>
      </dl>
    </section>
  )
}
