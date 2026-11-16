"use client"

import { useMemo } from "react"
import { Banknote, HandCoins, Receipt, Scale, TrendingUp, Wallet, type LucideIcon } from "lucide-react"
import { Money, StatTile } from "@/components/figures"
import { AgreePill } from "@/components/tracker/pills"
import { addDays, formatShort, type DateRange } from "@/lib/clock"
import { fySummary, KPI_DEFS, kpis, revenueCagr, type Kpis, type Source } from "@/lib/reports/financial"
import { differs } from "@/lib/tracker/explain"
import { PctChange, Variance } from "./variance"

const ICONS: Record<string, LucideIcon> = { income: TrendingUp, grossProfit: Scale, netProfit: Wallet, cash: Banknote, ar: HandCoins, ap: Receipt }

export default function KpiTiles({ range, source }: { range: DateRange; source: Source }) {
  const data = useMemo(() => {
    const sys = source === "compare" ? "xero" : source
    const cur = kpis(range.from, range.to, sys)
    const qbo = source === "compare" ? kpis(range.from, range.to, "qbo") : null
    const prev = range.compare ? kpis(range.compare.from, range.compare.to, sys) : null
    // Since Inception has no comparison window: balances vs a year earlier, P&L vs CAGR / last-FY growth
    const yearAgo = !range.compare ? kpis(range.from, addDays(range.to, -365), sys) : null
    const fys = !range.compare ? fySummary(sys) : null
    return { cur, qbo, prev, yearAgo, fys, cagr: fys ? revenueCagr(fys) : null }
  }, [range, source])

  const lastFull = data.fys?.filter((f) => !f.ytd).slice(-2)
  const fyGrowth = (k: "income" | "grossProfit" | "netProfit") => {
    if (!lastFull || lastFull.length < 2) return null
    const [a, b] = lastFull
    return a.totals[k] ? ((b.totals[k] - a.totals[k]) / Math.abs(a.totals[k])) * 100 : null
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {KPI_DEFS.map((d) => {
        const Icon = ICONS[d.key]
        const v = data.cur[d.key]
        const label =
          d.key === "grossProfit" ? `Gross profit · ${data.cur.grossMargin.toFixed(1)}% margin` : d.key === "netProfit" ? `Net profit · ${data.cur.netMargin.toFixed(1)}% margin` : d.balance ? `${d.label} at ${formatShort(range.to)}` : d.label
        return <StatTile key={d.key} label={label} value={<Money value={v} whole />} icon={<Icon className="h-4 w-4" />} sub={subFor(d.key)} />
      })}
    </section>
  )

  function subFor(k: keyof Kpis) {
    const def = KPI_DEFS.find((d) => d.key === k)!
    const v = data.cur[k]
    if (data.qbo) {
      const diff = v - data.qbo[k]
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <AgreePill diff={diff} agreeText="Agrees with QuickBooks" differText={`QuickBooks differs`} />
          {differs(diff) && (
            <span>
              QuickBooks <Money value={data.qbo[k]} whole />
            </span>
          )}
        </span>
      )
    }
    if (data.prev) {
      const margin = k === "grossProfit" ? ` (margin ${data.prev.grossMargin.toFixed(1)}%)` : k === "netProfit" ? ` (margin ${data.prev.netMargin.toFixed(1)}%)` : ""
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Variance current={v} previous={data.prev[k]} polarity={def.polarity} />
          <span>
            vs <Money value={data.prev[k]} whole />
            {margin} · {def.balance ? `at ${formatShort(range.compare!.to)}` : range.compare!.label}
          </span>
        </span>
      )
    }
    if (def.balance && data.yearAgo) {
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <Variance current={v} previous={data.yearAgo[k]} polarity={def.polarity} /> vs a year earlier
        </span>
      )
    }
    if (k === "income" && data.cagr) {
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <PctChange value={data.cagr.rate} /> a year compound growth ({data.cagr.from}–{data.cagr.to})
        </span>
      )
    }
    const g = k === "grossProfit" || k === "netProfit" ? fyGrowth(k) : null
    if (lastFull && lastFull.length === 2)
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <PctChange value={g} /> {lastFull[1].label} vs {lastFull[0].label}
        </span>
      )
    return null
  }
}
