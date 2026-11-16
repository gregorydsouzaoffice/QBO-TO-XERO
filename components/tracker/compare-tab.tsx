"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Info } from "lucide-react"
import { Money } from "@/components/figures"
import ExportButtons from "@/components/reports/export-buttons"
import { conversionDate, formatShort, todayISO } from "@/lib/clock"
import { compareTrialBalances } from "@/lib/data/ledger"
import { useIssues } from "@/lib/demo-store"
import { round2 } from "@/lib/format"
import { differs, explain } from "@/lib/tracker/explain"
import { tbCompareReport, trackerCtx, trackerFile, type TbCompareRow } from "@/lib/tracker/exports"
import { AgreePill, CodeTrace, IssueLinks } from "./pills"
import { cn } from "@/lib/utils"

/** Debit-positive balance shown as "1,234.00 Dr" / "1,234.00 Cr" */
function DrCr({ value }: { value: number }) {
  if (!differs(value)) return <span className="text-muted-foreground">0.00</span>
  return (
    <span className="whitespace-nowrap">
      <Money value={Math.abs(value)} currency={false} /> <span className="text-xs text-muted-foreground">{value > 0 ? "Dr" : "Cr"}</span>
    </span>
  )
}

export default function CompareTab() {
  const { list } = useIssues()
  const today = todayISO()
  const conv = conversionDate()
  const [onlyDiff, setOnlyDiff] = useState(true)

  const rows: TbCompareRow[] = useMemo(
    () =>
      compareTrialBalances(today).map((r) => {
        const e = explain(r.code, list, conv, today)
        return { ...r, issueIds: e.issues.map((i) => i.id), explained: e.explained }
      }),
    [list, today, conv],
  )
  const diffs = rows.filter((r) => differs(r.diff))
  const shown = onlyDiff ? diffs : rows
  const totals = {
    qboDr: round2(rows.reduce((t, r) => t + Math.max(0, r.qbo), 0)),
    qboCr: round2(rows.reduce((t, r) => t + Math.max(0, -r.qbo), 0)),
    xeroDr: round2(rows.reduce((t, r) => t + Math.max(0, r.xero), 0)),
    xeroCr: round2(rows.reduce((t, r) => t + Math.max(0, -r.xero), 0)),
  }
  const unexplained = diffs.filter((r) => differs(r.diff - r.explained)).length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Accounts compared" value={String(rows.length)} />
        <Tile label="Accounts that differ" value={String(diffs.length)} tone={diffs.length ? "danger" : "success"} />
        <Tile label="Differences explained by a discrepancy" value={`${diffs.length - unexplained} of ${diffs.length}`} tone={unexplained ? "warning" : "success"} />
        <Tile label="Both trial balances balance" value={!differs(totals.qboDr - totals.qboCr) && !differs(totals.xeroDr - totals.xeroCr) ? "Yes" : "No"} tone="success" />
      </section>

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Trial balance at {formatShort(today)}</div>
            <div className="text-xs text-muted-foreground">Balance-sheet accounts at today plus profit and loss for the financial year to date. Difference = Xero minus QuickBooks.</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              Only differences
            </label>
            <ExportButtons compact build={() => ({ reports: [tbCompareReport(rows, today)], ctx: trackerCtx("QuickBooks Online vs Xero", conv, today), name: trackerFile("trial-balance") })} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[960px]">
            <thead>
              <tr>
                <th>Account</th>
                <th className="num">QuickBooks</th>
                <th className="num">Xero</th>
                <th className="num">Difference</th>
                <th>Result</th>
                <th>Explained by</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const d = differs(r.diff)
                const full = d && !differs(r.diff - r.explained)
                return (
                  <tr key={r.code}>
                    <td>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs">
                        <CodeTrace qbo={r.code} xero={r.xeroCode} />
                        {r.xeroName !== r.name && <span className="text-muted-foreground"> · Xero: {r.xeroName}</span>}
                      </div>
                    </td>
                    <td className="num"><DrCr value={r.qbo} /></td>
                    <td className="num"><DrCr value={r.xero} /></td>
                    <td className={cn("num", d && "font-semibold text-destructive")}>{d ? <Money value={r.diff} /> : "—"}</td>
                    <td><AgreePill diff={r.diff} /></td>
                    <td>
                      {d ? (
                        <div className="space-y-1">
                          <IssueLinks ids={r.issueIds} empty="Not yet explained" />
                          {full ? (
                            <div className="flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="h-3 w-3" /> Explained in full
                            </div>
                          ) : (
                            <div className="text-xs text-warning">
                              <Money value={r.diff - r.explained} /> not explained
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
                    Every account agrees between QuickBooks and Xero.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-semibold">
                <td className="px-4 py-2.5">Total debits / credits</td>
                <td className="num px-4 py-2.5 text-xs">
                  <Money value={totals.qboDr} currency={false} /> Dr<br />
                  <Money value={totals.qboCr} currency={false} /> Cr
                </td>
                <td className="num px-4 py-2.5 text-xs">
                  <Money value={totals.xeroDr} currency={false} /> Dr<br />
                  <Money value={totals.xeroCr} currency={false} /> Cr
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="flex items-start gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Trial balances agreed to the cent at the conversion date ({formatShort(conv)}). Every difference since then comes from a transaction entered in one system but not the other, and is matched to the discrepancy that caused it.
        </p>
      </section>
    </div>
  )
}

function Tile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  return (
    <div className={cn("panel p-4", tone !== "default" && "border-l-4", tone === "success" && "border-l-success", tone === "warning" && "border-l-warning", tone === "danger" && "border-l-destructive")}>
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}
