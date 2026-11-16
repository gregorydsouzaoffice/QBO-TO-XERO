"use client"

import { useMemo } from "react"
import { GroupedBars, type SeriesDef } from "@/components/charts"
import { Money } from "@/components/figures"
import { AgreePill } from "@/components/tracker/pills"
import ExportButtons from "./export-buttons"
import { CHART_COLOURS } from "@/lib/brand"
import { sinceInception } from "@/lib/clock"
import { exportName, fyReport, fySummary, reportCtx, revenueCagr, SOURCE_LABEL, type Source } from "@/lib/reports/financial"
import { cn } from "@/lib/utils"
import { PctChange } from "./variance"

/** Since Inception: yearly revenue chart and a table with every financial year */
export default function FyPanel({ source }: { source: Source }) {
  const rows = useMemo(() => fySummary(source), [source])
  const cagr = revenueCagr(rows)
  const system = source === "compare"
  const range = sinceInception()

  const chart = rows.map((r): Record<string, string | number> => (system ? { label: r.label.replace(" YTD", ""), qbo: r.totals.income, xero: r.other!.income } : { label: r.label.replace(" YTD", ""), rev: r.totals.income }))
  const series: SeriesDef[] = system
    ? [
        { key: "xero", label: "Xero", colour: CHART_COLOURS.xero },
        { key: "qbo", label: "QuickBooks", colour: CHART_COLOURS.qbo },
      ]
    : [{ key: "rev", label: "Revenue", colour: source === "qbo" ? CHART_COLOURS.qbo : CHART_COLOURS.xero }]

  return (
    <section className="panel">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">Financial years since inception</div>
          <div className="text-xs text-muted-foreground">
            Revenue by financial year (the current year is to date) · {SOURCE_LABEL[source]}
            {cagr ? ` · ${cagr.rate.toFixed(1)}% a year compound growth (${cagr.from}–${cagr.to})` : ""}
          </div>
        </div>
        <ExportButtons compact build={() => ({ reports: [fyReport(source)], ctx: reportCtx(range, source), name: exportName(range, source, "financial-years") })} />
      </div>
      <div className="p-4">
        <GroupedBars data={chart} series={series} height={240} />
      </div>
      <div className="overflow-x-auto border-t border-border">
        {system ? (
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Financial year</th>
                <th className="num">Revenue · QuickBooks</th>
                <th className="num">Revenue · Xero</th>
                <th className="num">Net profit · QuickBooks</th>
                <th className="num">Net profit · Xero</th>
                <th className="num">Difference</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = r.other!.netProfit - r.totals.netProfit
                return (
                  <tr key={r.fy}>
                    <td className="font-medium">{r.label}</td>
                    <td className="num"><Money value={r.totals.income} whole /></td>
                    <td className="num"><Money value={r.other!.income} whole /></td>
                    <td className="num"><Money value={r.totals.netProfit} whole /></td>
                    <td className="num"><Money value={r.other!.netProfit} whole /></td>
                    <td className={cn("num", Math.abs(d) > 0.005 && "font-semibold text-destructive")}>{Math.abs(d) > 0.005 ? <Money value={d} /> : "—"}</td>
                    <td><AgreePill diff={d} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Financial year</th>
                <th className="num">Revenue</th>
                <th className="num">Revenue growth</th>
                <th className="num">Gross profit</th>
                <th className="num">Gross margin</th>
                <th className="num">Net profit</th>
                <th className="num">Net margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.fy} className={cn(r.ytd && "bg-accent/30")}>
                  <td>
                    <div className="font-medium">{r.label}</div>
                    {r.ytd && <div className="text-xs text-muted-foreground">Growth vs same period last year</div>}
                  </td>
                  <td className="num"><Money value={r.totals.income} whole /></td>
                  <td className="num"><PctChange value={r.growth} /></td>
                  <td className="num"><Money value={r.totals.grossProfit} whole /></td>
                  <td className="num">{r.totals.grossMargin.toFixed(1)}%</td>
                  <td className="num"><Money value={r.totals.netProfit} whole /></td>
                  <td className="num">{r.totals.netMargin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
