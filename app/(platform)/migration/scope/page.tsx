"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, History, Sparkles } from "lucide-react"
import { SystemChip } from "@/components/brand"
import StepShell from "@/components/migration/step-shell"
import { conversionDate, formatShort, migratedThrough } from "@/lib/clock"
import { HISTORY_OPTIONS, preConversionChecks, scanRows, scanTotals, scopeWindow } from "@/lib/data/migration"
import { fmtInt } from "@/lib/format"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

export default function ScopePage() {
  const router = useRouter()
  const { state, update } = useDemo()
  const { history, gojeeEnabled } = state.migration
  const w = useMemo(() => scopeWindow(history), [history])
  const rows = useMemo(() => scanRows(history, gojeeEnabled), [history, gojeeEnabled])
  const totals = useMemo(() => scanTotals(history, gojeeEnabled), [history, gojeeEnabled])
  const checks = useMemo(() => preConversionChecks(), [])
  const warnings = checks.filter((c) => c.status === "warning").length

  return (
    <StepShell
      step={2}
      title="Choose what to bring across"
      description="We scanned your QuickBooks company. Pick how much history to migrate, check the conversion date, and clear anything flagged before import."
      next={{ to: "Map", onClick: () => router.push("/migration/map") }}
      footerNote={`${fmtInt(totals.total)} records selected`}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* History */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> How much history
            </div>
          </div>
          <div role="radiogroup" aria-label="History to migrate" className="space-y-2.5 p-5">
            {HISTORY_OPTIONS.map((o) => {
              const on = o.key === history
              const ow = scopeWindow(o.key)
              const t = scanTotals(o.key, gojeeEnabled)
              return (
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => update((s) => ({ ...s, migration: { ...s.migration, history: o.key } }))}
                  className={cn("flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors", on ? "border-primary bg-accent/50 ring-1 ring-primary" : "border-border hover:bg-muted/50")}
                >
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", on ? "border-primary" : "border-input")}>{on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="font-semibold text-foreground">{o.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{fmtInt(t.total)} records</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{o.text}</span>
                    <span className="mt-1 block text-xs font-medium text-foreground/80">{ow.describe}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Conversion date */}
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4 text-primary" /> Conversion date
            </div>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">Xero goes live</div>
                <div className="mt-1 text-xl font-bold">{formatShort(conversionDate())}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">First day of last month</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">History migrated through</div>
                <div className="mt-1 text-xl font-bold">{formatShort(migratedThrough())}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">QuickBooks closing date</div>
              </div>
            </div>

            <ol className="relative space-y-4 border-l-2 border-border pl-5 text-sm">
              <li>
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-muted-foreground/60" aria-hidden />
                <div className="font-semibold">Up to {formatShort(migratedThrough())}</div>
                <p className="text-muted-foreground">
                  History moves to Xero{gojeeEnabled ? " and Gojee" : ""}. {w.summaryMonths > 0 && w.detailFrom ? `Before ${formatShort(w.detailFrom)}, ${w.summaryMonths} months come across as monthly balances so comparative reports still work.` : w.detailFrom ? "Every transaction comes across in full detail." : `Balances at ${formatShort(migratedThrough())}, open invoices and bills, and ${w.summaryMonths} months of monthly balances for comparatives.`}
                </p>
              </li>
              <li>
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-primary" aria-hidden />
                <div className="font-semibold">From {formatShort(conversionDate())}</div>
                <p className="text-muted-foreground">QuickBooks and Xero run in parallel. You keep working in both while you build confidence in Xero.</p>
              </li>
              <li>
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-xero" aria-hidden />
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Every 2 hours
                </div>
                <p className="text-muted-foreground">AI QA compares QuickBooks with Xero, transaction by transaction and balance by balance, and emails a report with any differences.</p>
              </li>
            </ol>
            {w.archivedFys.length > 0 && (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Earlier years ({w.archivedFys.length}) stay in the QuickBooks archive and in the PDF/CSV export; they are not in Xero.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Scan */}
      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Pre-migration scan of QuickBooks</div>
            <div className="text-xs text-muted-foreground">Counts follow your history choice. Lists (accounts, contacts, items) always come across in full.</div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="pill-info">{fmtInt(totals.xero)} to Xero</span>
            {gojeeEnabled ? <span className="pill-info">{fmtInt(totals.gojee)} to Gojee</span> : <span className="pill-muted">Gojee off</span>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>QuickBooks records</th>
                <th className="num">In QuickBooks</th>
                <th className="num">Migrating</th>
                <th>Destination</th>
                <th>Becomes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <div className="font-medium">{r.name}</div>
                    {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                  </td>
                  <td className="num">{fmtInt(r.total)}</td>
                  <td className="num font-semibold">{fmtInt(r.migrating)}</td>
                  <td>{r.archived ? <span className="pill-muted">Archive only</span> : <SystemChip system={r.destination} />}</td>
                  <td className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      {r.archived ? "PDF and CSV archive" : r.becomes}
                      {r.openOnly && !r.archived && <span className="pill-muted">open only</span>}
                    </span>
                  </td>
                </tr>
              ))}
              {w.summaryMonths > 0 && (
                <tr>
                  <td>
                    <div className="font-medium">Monthly comparative balances</div>
                    <div className="text-xs text-muted-foreground">
                      {formatShort(w.summaryFrom!)} – {formatShort(w.summaryTo!)}
                    </div>
                  </td>
                  <td className="num text-muted-foreground">—</td>
                  <td className="num font-semibold">{fmtInt(w.summaryMonths)}</td>
                  <td>
                    <SystemChip system="xero" />
                  </td>
                  <td className="text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3" /> Monthly summary journals
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="num px-4 py-2.5">{fmtInt(totals.inQbo)}</td>
                <td className="num px-4 py-2.5">{fmtInt(totals.total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Checklist */}
      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Before the conversion date</div>
            <div className="text-xs text-muted-foreground">Checked by the scan at {formatShort(migratedThrough())}</div>
          </div>
          {warnings > 0 ? (
            <span className="pill-warning">
              <AlertTriangle className="h-3 w-3" /> {warnings} to look at, none blocking
            </span>
          ) : (
            <span className="pill-success">
              <CheckCircle2 className="h-3 w-3" /> All clear
            </span>
          )}
        </div>
        <ul className="divide-y divide-border">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-3 px-5 py-3">
              {c.status === "pass" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Passed" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-label="Warning" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.title}</div>
                <div className="text-sm text-muted-foreground">{c.detail}</div>
              </div>
              {c.status === "pass" ? <span className="pill-success hidden sm:inline-flex">Passed</span> : <span className="pill-warning hidden sm:inline-flex">Warning</span>}
            </li>
          ))}
        </ul>
      </section>
    </StepShell>
  )
}
