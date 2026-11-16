"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CHART_COLOURS } from "@/lib/brand"
import { fmtCompact } from "@/components/figures"
import { fmtMoney } from "@/lib/format"

/*
 * Chart conventions (dataviz skill): one y-axis, at most two categorical
 * series (#0078C8 / #108043, validated), comparison period in dashed neutral
 * grey, 2px lines, recessive grid, legend for 2+ series, crosshair tooltip.
 */

export interface SeriesDef {
  key: string
  label: string
  colour?: string
  dashed?: boolean
}

function Legend({ series }: { series: SeriesDef[] }) {
  if (series.length < 2) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden>
            <line x1="1" y1="4" x2="17" y2="4" stroke={s.colour} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} strokeLinecap="round" />
          </svg>
          {s.label}
        </span>
      ))}
    </div>
  )
}

function TooltipBox({ active, payload, label, series }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string; series: SeriesDef[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {series.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key)
        if (!p) return null
        return (
          <div key={s.key} className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: s.colour }} />
              {s.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{fmtMoney(p.value, { currency: true })}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Line chart over time (e.g. monthly revenue, current vs comparison). */
export function TrendChart({ data, xKey = "label", series, height = 260 }: { data: Record<string, number | string>[]; xKey?: string; series: SeriesDef[]; height?: number }) {
  const s = series.map((d, i) => ({ ...d, colour: d.colour ?? (d.dashed ? CHART_COLOURS.reference : i === 0 ? CHART_COLOURS.xero : CHART_COLOURS.qbo) }))
  return (
    <div>
      <Legend series={s} />
      <div style={{ height }} role="img" aria-label={`Line chart: ${s.map((x) => x.label).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_COLOURS.grid} vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: CHART_COLOURS.grid }} tick={{ fill: CHART_COLOURS.axis, fontSize: 11 }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_COLOURS.axis, fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} width={56} />
            <Tooltip content={<TooltipBox series={s} />} cursor={{ stroke: CHART_COLOURS.axis, strokeWidth: 1, strokeDasharray: "3 3" }} />
            {s.map((d) => (
              <Line key={d.key} type="monotone" dataKey={d.key} stroke={d.colour} strokeWidth={2} strokeDasharray={d.dashed ? "5 4" : undefined} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Grouped bars by category (e.g. QBO vs Xero per account group). */
export function GroupedBars({ data, xKey = "label", series, height = 260 }: { data: Record<string, number | string>[]; xKey?: string; series: SeriesDef[]; height?: number }) {
  const s = series.map((d, i) => ({ ...d, colour: d.colour ?? (d.dashed ? CHART_COLOURS.reference : i === 0 ? CHART_COLOURS.xero : CHART_COLOURS.qbo) }))
  return (
    <div>
      <Legend series={s} />
      <div style={{ height }} role="img" aria-label={`Bar chart: ${s.map((x) => x.label).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid stroke={CHART_COLOURS.grid} vertical={false} />
            <XAxis dataKey={xKey} tickLine={false} axisLine={{ stroke: CHART_COLOURS.grid }} tick={{ fill: CHART_COLOURS.axis, fontSize: 11 }} interval={0} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: CHART_COLOURS.axis, fontSize: 11 }} tickFormatter={(v: number) => fmtCompact(v)} width={56} />
            <Tooltip content={<TooltipBox series={s} />} cursor={{ fill: "hsl(210 20% 95% / 0.7)" }} />
            {s.map((d) => (
              <Bar key={d.key} dataKey={d.key} fill={d.colour} radius={[4, 4, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
