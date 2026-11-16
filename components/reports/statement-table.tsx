import { Money } from "@/components/figures"
import { AgreePill, CodeTrace } from "@/components/tracker/pills"
import type { Statement } from "@/lib/reports/financial"
import { differs } from "@/lib/tracker/explain"
import { cn } from "@/lib/utils"
import { PctChange, varianceTone } from "./variance"

/**
 * Renders a P&L or balance sheet statement. Three layouts:
 *  - period mode with a comparison: current | comparison | variance $ | variance %
 *  - period mode without one (Since Inception P&L): amount | % of revenue
 *  - system mode (Compare): QuickBooks | Xero | difference | result
 */
export default function StatementTable({ st }: { st: Statement }) {
  const system = st.mode === "system"
  const hasB = st.bLabel !== null
  const share = !hasB && st.revenue !== 0
  const cols = 2 + (hasB ? 3 : share ? 1 : 0)

  return (
    <div className="overflow-x-auto">
      <table className={cn("data-table", hasB ? "min-w-[760px]" : "min-w-[520px]")}>
        <thead>
          <tr>
            <th>Account</th>
            <th className="num">{st.aLabel}</th>
            {hasB && <th className="num">{st.bLabel}</th>}
            {hasB && <th className="num">{st.diffLabel} $</th>}
            {hasB && <th className={system ? "" : "num"}>{system ? "Result" : `${st.diffLabel} %`}</th>}
            {share && <th className="num">% of revenue</th>}
          </tr>
        </thead>
        <tbody>
          {st.rows.map((r, i) => {
            if (r.kind === "heading")
              return (
                <tr key={`h-${i}`} className="bg-muted/30 hover:bg-muted/30">
                  <td colSpan={cols} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.label}
                  </td>
                </tr>
              )
            const strong = r.kind !== "account"
            const d = r.diff ?? 0
            return (
              <tr key={`${r.label}-${i}`} className={cn(strong && "font-semibold", r.kind === "total" && "bg-accent/40")}>
                <td className={cn(r.kind === "account" && "pl-6")}>
                  <div>{r.label}</div>
                  {r.code && <CodeTrace qbo={r.code} xero={r.xeroCode} />}
                </td>
                <td className="num">
                  <Money value={r.a} />
                </td>
                {hasB && (
                  <td className="num">
                    <Money value={r.b ?? 0} />
                  </td>
                )}
                {hasB && (
                  <td className={cn("num", system ? differs(d) && "text-destructive" : varianceTone(d, r.polarity))}>
                    {system && !differs(d) ? "—" : <Money value={d} />}
                  </td>
                )}
                {hasB && <td className={system ? "" : "num"}>{system ? <AgreePill diff={d} /> : <PctChange value={r.pct} polarity={r.polarity} />}</td>}
                {share && <td className="num text-muted-foreground">{((r.a / st.revenue) * 100).toFixed(1)}%</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
