"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, ShieldCheck } from "lucide-react"
import { Money, StatTile } from "@/components/figures"
import StepShell, { CheckPill } from "@/components/migration/step-shell"
import { Progress } from "@/components/ui/progress"
import { formatShort } from "@/lib/clock"
import { compareTrialBalances } from "@/lib/data/ledger"
import { useDemo } from "@/lib/demo-store"
import { validationSummary } from "@/lib/reports/migration"
import { cn } from "@/lib/utils"

const ok = (n: number) => Math.abs(n) < 0.005
const GST_ROWS = 8

export default function ValidatePage() {
  const router = useRouter()
  const { state } = useDemo()
  const scope = state.migration.history
  const v = useMemo(() => validationSummary(scope), [scope])
  const [running, setRunning] = useState(true)
  const [progress, setProgress] = useState(0)
  const [showAccounts, setShowAccounts] = useState(false)
  const accounts = useMemo(() => (showAccounts ? compareTrialBalances(v.w.through) : []), [showAccounts, v.w.through])

  useEffect(() => {
    setRunning(true)
    setProgress(0)
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 9)), 90)
    const t = setTimeout(() => setRunning(false), 1150)
    return () => {
      clearInterval(id)
      clearTimeout(t)
    }
  }, [scope])

  return (
    <StepShell
      step={4}
      title="Validate before importing"
      description="We built the Xero file in a staging area and compared it with QuickBooks: trial balance, profit and loss, balance sheet, ageing, bank and GST."
      next={{ to: "Import", onClick: () => router.push("/migration/import"), disabled: running || !v.pass }}
      footerNote={running ? "Running checks…" : v.pass ? `${v.checks} checks passed` : "Fix differences first"}
    >
      {running ? (
        <section className="panel p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="font-semibold">Comparing QuickBooks with Xero staging…</div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
          <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
            {v.groups.map((g, i) => (
              <li key={g.key} className="flex items-center gap-2">
                {progress > (i + 1) * 15 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <span className="h-4 w-4 rounded-full border-2 border-border" />}
                {g.label}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Checks run" value={v.checks} sub={v.w.describe} icon={<ShieldCheck className="h-4 w-4" />} tone="info" />
            <StatTile label="Result" value={v.pass ? "All match" : "Differences"} sub="QuickBooks vs Xero staging, to the cent" icon={<CheckCircle2 className="h-4 w-4" />} tone={v.pass ? "success" : "danger"} />
            <StatTile label="Conversion balances" value={formatShort(v.w.through)} sub="The day before Xero goes live" />
            <StatTile label="Warnings" value={v.warnings.length} sub="Non-blocking, worth a look" icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">Summary</div>
            </div>
            <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
              {v.groups.map((g) => (
                <li key={g.key} className="flex items-center justify-between gap-3 px-5 py-3 sm:border-b sm:border-border">
                  <div>
                    <div className="text-sm font-medium">{g.label}</div>
                    <div className="text-xs text-muted-foreground">{g.count} {g.count === 1 ? "check" : "checks"}</div>
                  </div>
                  <CheckPill status={g.pass ? "pass" : "fail"} label={g.pass ? "Pass" : "Differs"} />
                </li>
              ))}
            </ul>
          </section>

          {/* Trial balance */}
          <Block title="Trial balance" sub="Total debits at each financial year end and at the conversion date, compared account by account">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>As at</th>
                  <th className="num">Accounts</th>
                  <th className="num">QuickBooks debits</th>
                  <th className="num">Xero debits</th>
                  <th className="num">Accounts that differ</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {v.tb.map((t) => (
                  <tr key={t.date}>
                    <td className="font-medium">{t.label}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{formatShort(t.date)}</td>
                    <td className="num">{t.accounts}</td>
                    <td className="num">
                      <Money value={t.qboDebits} />
                    </td>
                    <td className="num">
                      <Money value={t.xeroDebits} />
                    </td>
                    <td className="num">{t.mismatched}</td>
                    <td>
                      <CheckPill status={t.mismatched ? "fail" : "pass"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setShowAccounts((s) => !s)} className="flex w-full items-center gap-1.5 border-t border-border px-5 py-2.5 text-sm font-medium text-primary hover:bg-accent/40" aria-expanded={showAccounts}>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAccounts && "rotate-180")} />
              {showAccounts ? "Hide" : "Show"} account by account at {formatShort(v.w.through)}
            </button>
            {showAccounts && (
              <table className="data-table border-t border-border">
                <thead>
                  <tr>
                    <th>QBO</th>
                    <th>Account</th>
                    <th>Xero</th>
                    <th className="num">QuickBooks</th>
                    <th className="num">Xero</th>
                    <th className="num">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((r) => (
                    <tr key={r.code}>
                      <td className="tabular-nums text-muted-foreground">{r.code}</td>
                      <td>{r.name}</td>
                      <td className="tabular-nums text-muted-foreground">{r.xeroCode}</td>
                      <td className="num">
                        <Money value={r.qbo} />
                      </td>
                      <td className="num">
                        <Money value={r.xero} />
                      </td>
                      <td className={cn("num", ok(r.diff) ? "text-success" : "font-semibold text-destructive")}>{ok(r.diff) ? "0.00" : <Money value={r.diff} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Block>

          {/* P&L */}
          <Block title="Profit and loss by financial year" sub={v.w.summaryMonths ? `Years before ${formatShort(v.w.detailFrom ?? v.w.through)} come from monthly summary journals and still agree by account and month` : "Every year in full detail"}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Financial year</th>
                  <th className="num">Income (QBO)</th>
                  <th className="num">Income (Xero)</th>
                  <th className="num">Net profit (QBO)</th>
                  <th className="num">Net profit (Xero)</th>
                  <th className="num">Difference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...v.pl].reverse().map((p) => (
                  <tr key={p.fy}>
                    <td className="font-medium">{p.label}</td>
                    <td className="num">
                      <Money value={p.qbo.income} whole />
                    </td>
                    <td className="num">
                      <Money value={p.xero.income} whole />
                    </td>
                    <td className="num">
                      <Money value={p.qbo.netProfit} whole />
                    </td>
                    <td className="num">
                      <Money value={p.xero.netProfit} whole />
                    </td>
                    <td className="num">
                      <Money value={p.diff} />
                    </td>
                    <td>
                      <CheckPill status={ok(p.diff) ? "pass" : "fail"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>

          <div className="grid gap-6 xl:grid-cols-2">
            <Block title="Balance sheet" sub={`At ${formatShort(v.w.through)}`}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th className="num">QuickBooks</th>
                    <th className="num">Xero</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {v.bs.map((b) => (
                    <tr key={b.section}>
                      <td className="font-medium">{b.label}</td>
                      <td className="num">
                        <Money value={b.qbo} />
                      </td>
                      <td className="num">
                        <Money value={b.xero} />
                      </td>
                      <td>
                        <CheckPill status={ok(b.diff) ? "pass" : "fail"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>

            <Block title="Bank and card balances" sub={`At ${formatShort(v.w.through)}, also agreed to the bank statements`}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="num">QuickBooks</th>
                    <th className="num">Xero</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {v.bank.map((b) => (
                    <tr key={b.code}>
                      <td>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">
                          QBO {b.code} → Xero {b.xeroCode}
                        </div>
                      </td>
                      <td className="num">
                        <Money value={b.qbo} />
                      </td>
                      <td className="num">
                        <Money value={b.xero} />
                      </td>
                      <td>
                        <CheckPill status={ok(b.diff) ? "pass" : "fail"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {([
              ["Aged receivables", v.ar],
              ["Aged payables", v.ap],
            ] as const).map(([title, a]) => (
              <Block key={title} title={title} sub={`At ${formatShort(v.w.through)}, migrated invoice by invoice with original dates`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Age</th>
                      <th className="num">QuickBooks</th>
                      <th className="num">Xero</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.buckets.map((b) => (
                      <tr key={b.bucket}>
                        <td>{b.bucket}</td>
                        <td className="num">
                          <Money value={b.qbo} />
                        </td>
                        <td className="num">
                          <Money value={b.xero} />
                        </td>
                        <td>
                          <CheckPill status={ok(b.diff) ? "pass" : "fail"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-4 py-2.5">Total</td>
                      <td className="num px-4 py-2.5">
                        <Money value={a.total.qbo} />
                      </td>
                      <td className="num px-4 py-2.5">
                        <Money value={a.total.xero} />
                      </td>
                      <td className="px-4 py-2.5">
                        <CheckPill status={ok(a.total.diff) ? "pass" : "fail"} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </Block>
            ))}
          </div>

          <Block title="GST by BAS quarter" sub={v.gst.total > GST_ROWS ? `Latest ${GST_ROWS} of ${v.gst.total} quarters shown; all ${v.gst.total} match` : `${v.gst.total} quarters`}>
            {v.gst.rows.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No full BAS quarter falls inside the migrated period. The GST balance is checked in the trial balance.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quarter</th>
                    <th>Period</th>
                    <th className="num">GST on sales (1A)</th>
                    <th className="num">GST on purchases (1B)</th>
                    <th className="num">Net GST (QBO)</th>
                    <th className="num">Net GST (Xero)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {v.gst.rows.slice(0, GST_ROWS).map((g) => (
                    <tr key={g.from}>
                      <td className="font-medium">{g.label}</td>
                      <td className="whitespace-nowrap text-muted-foreground">
                        {formatShort(g.from)} – {formatShort(g.to)}
                      </td>
                      <td className="num">
                        <Money value={g.xero.sales} />
                      </td>
                      <td className="num">
                        <Money value={g.xero.purchases} />
                      </td>
                      <td className="num">
                        <Money value={g.qbo.net} />
                      </td>
                      <td className="num">
                        <Money value={g.xero.net} />
                      </td>
                      <td>
                        <CheckPill status={ok(g.diff) ? "pass" : "fail"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Block>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Warnings (non-blocking)
              </div>
            </div>
            <ul className="divide-y divide-border">
              {v.warnings.map((w) => (
                <li key={w.title} className="flex items-start gap-3 px-5 py-3">
                  <span className="pill-warning mt-0.5 shrink-0">
                    <AlertTriangle className="h-3 w-3" /> Review
                  </span>
                  <div>
                    <div className="text-sm font-medium">{w.title}</div>
                    <div className="text-sm text-muted-foreground">{w.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </StepShell>
  )
}

function Block({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">{title}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
