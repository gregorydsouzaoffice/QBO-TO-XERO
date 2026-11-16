"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, CalendarCheck2, CheckCircle2, CircleDashed, Database, LayoutDashboard } from "lucide-react"
import { GojeeLogo, GojeeMark, QuickBooksLogo, QuickBooksMark, SystemChip, XeroMark, XeroWordmark } from "@/components/brand"
import { StatTile } from "@/components/figures"
import MigrationReportList from "@/components/migration/report-list"
import MigrationStepper from "@/components/migration/stepper"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { conversionDate, formatDateTime, formatShort, migratedThrough, parallelRunDay } from "@/lib/clock"
import { COMPANY, GOJEE_ACCOUNT, QBO_COMPANY, XERO_ORG } from "@/lib/data/company"
import { HISTORY_OPTIONS, WIZARD_STEPS, scanRows, scanTotals, scopeWindow, stepHref } from "@/lib/data/migration"
import { fmtInt } from "@/lib/format"
import { useDemo } from "@/lib/demo-store"
import { validationSummary } from "@/lib/reports/migration"

export default function MigrationOverview() {
  const { state, hydrated } = useDemo()
  if (!hydrated) return null
  return state.migration.status === "completed" ? <Summary /> : <InProgress />
}

// ---------------------------------------------------------------------------

function InProgress() {
  const { state } = useDemo()
  const { step, status, history, gojeeEnabled } = state.migration
  const imported = status === "in-progress" && step >= 6
  const furthest = Math.max(1, Math.min(6, step))
  const pct = imported ? 92 : Math.round(((furthest - 1) / WIZARD_STEPS.length) * 100)
  const started = furthest > 1 || state.qbo.connected || state.xero.connected
  const totals = scanTotals(history, gojeeEnabled)
  const current = WIZARD_STEPS[furthest - 1]

  return (
    <>
      <PageHeader eyebrow={COMPANY.name} title="Migration" description="Move your books from QuickBooks Online to Xero, with jobs, quotes, purchase orders and inventory going to Gojee." />
      <PageBody>
        <MigrationStepper current={furthest} />

        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-border bg-accent/40 px-6 py-5">
            <QuickBooksLogo height={28} />
            <ArrowRight className="h-5 w-5 text-primary" />
            <XeroWordmark height={22} />
            {gojeeEnabled && (
              <>
                <span className="text-muted-foreground">+</span>
                <GojeeLogo height={24} />
              </>
            )}
          </div>
          <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <div className="text-sm text-muted-foreground">{started ? "In progress" : "Not started"}</div>
              <div className="mt-1 text-xl font-bold">
                {imported ? "Imported. One step to go: go live." : started ? `Step ${furthest} of ${WIZARD_STEPS.length}: ${current.title}` : "Start by connecting QuickBooks Online and Xero"}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Progress value={pct} className="h-2" />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{pct}%</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href={stepHref(furthest)}>
                    {started ? `Continue: ${current.title}` : "Start migration"} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">QuickBooks Online</dt>
              <dd>{state.qbo.connected ? <Connected /> : <NotConnected />}</dd>
              <dt className="text-muted-foreground">Xero</dt>
              <dd>{state.xero.connected ? <Connected /> : <NotConnected />}</dd>
              <dt className="text-muted-foreground">Gojee</dt>
              <dd>{!gojeeEnabled ? <span className="pill-muted">Off</span> : state.gojee.connected ? <Connected /> : <NotConnected />}</dd>
              <dt className="text-muted-foreground">History</dt>
              <dd className="font-medium">{HISTORY_OPTIONS.find((o) => o.key === history)?.label}</dd>
              <dt className="text-muted-foreground">Conversion date</dt>
              <dd className="font-medium">{formatShort(conversionDate())}</dd>
              <dt className="text-muted-foreground">Records selected</dt>
              <dd className="font-medium tabular-nums">{fmtInt(totals.total)}</dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">The six steps</div>
          </div>
          <ol className="divide-y divide-border">
            {WIZARD_STEPS.map((s) => {
              const done = s.n < furthest || (imported && s.n <= 5)
              const reachable = s.n <= furthest
              return (
                <li key={s.slug} className="flex items-center gap-4 px-5 py-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-success text-white" : s.n === furthest ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.text}</div>
                  </div>
                  {reachable && (
                    <Link href={stepHref(s.n)} className="text-sm font-medium text-primary hover:underline">
                      {done ? "Review" : "Open"}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      </PageBody>
    </>
  )
}

function Connected() {
  return (
    <span className="pill-success">
      <CheckCircle2 className="h-3 w-3" /> Connected
    </span>
  )
}
function NotConnected() {
  return (
    <span className="pill-muted">
      <CircleDashed className="h-3 w-3" /> Not connected
    </span>
  )
}

// ---------------------------------------------------------------------------

function Summary() {
  const { state } = useDemo()
  const { history, gojeeEnabled, completedAt } = state.migration
  const w = scopeWindow(history)
  const rows = useMemo(() => scanRows(history, gojeeEnabled), [history, gojeeEnabled])
  const totals = useMemo(() => scanTotals(history, gojeeEnabled), [history, gojeeEnabled])
  const v = useMemo(() => validationSummary(history), [history])

  return (
    <>
      <PageHeader
        eyebrow={COMPANY.name}
        title="Migration complete"
        description={`Xero has been live since ${formatShort(conversionDate())}. QuickBooks and Xero have run in parallel for ${parallelRunDay()} days.`}
        actions={
          <Button asChild size="lg">
            <Link href="/home">
              <LayoutDashboard className="mr-1.5 h-4 w-4" /> Parallel-run dashboard
            </Link>
          </Button>
        }
      />
      <PageBody>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Records migrated" value={fmtInt(totals.total)} sub={`${fmtInt(totals.xero)} to Xero${gojeeEnabled ? `, ${fmtInt(totals.gojee)} to Gojee` : ""}`} icon={<Database className="h-4 w-4" />} tone="info" />
          <StatTile label="Conversion date" value={formatShort(conversionDate())} sub={`History migrated through ${formatShort(migratedThrough())}`} icon={<CalendarCheck2 className="h-4 w-4" />} />
          <StatTile label="Validation" value={v.pass ? "All match" : "Differences"} sub={`${v.checks} checks, QuickBooks vs Xero`} icon={<CheckCircle2 className="h-4 w-4" />} tone={v.pass ? "success" : "danger"} />
          <StatTile label="History" value={HISTORY_OPTIONS.find((o) => o.key === history)?.label.replace(/ \(.*\)/, "") ?? ""} sub={w.describe} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">What was migrated</div>
              <span className="text-xs text-muted-foreground">{completedAt ? `Finished ${formatDateTime(new Date(completedAt))}` : null}</span>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>QuickBooks records</th>
                    <th className="num">Migrated</th>
                    <th>Destination</th>
                    <th>Became</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="font-medium">{r.name}</td>
                      <td className="num">{fmtInt(r.migrating)}</td>
                      <td>{r.archived ? <span className="pill-muted">Archive</span> : <SystemChip system={r.destination} />}</td>
                      <td className="text-muted-foreground">{r.archived ? "PDF and CSV archive" : r.becomes}</td>
                    </tr>
                  ))}
                  {w.summaryMonths > 0 && (
                    <tr>
                      <td className="font-medium">Monthly comparative balances</td>
                      <td className="num">{fmtInt(w.summaryMonths)}</td>
                      <td>
                        <SystemChip system="xero" />
                      </td>
                      <td className="text-muted-foreground">Monthly summary journals</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">Connections</div>
            </div>
            <ul className="divide-y divide-border">
              <li className="flex items-center gap-3 px-5 py-3">
                <QuickBooksMark size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">QuickBooks Online · source</div>
                  <div className="truncate text-xs text-muted-foreground">
                    Realm {state.qbo.realmId} · {QBO_COMPANY.edition} · read-only for the parallel run
                  </div>
                </div>
              </li>
              <li className="flex items-center gap-3 px-5 py-3">
                <XeroMark size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Xero · {XERO_ORG.plan}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {XERO_ORG.name} · {XERO_ORG.shortCode}
                  </div>
                </div>
              </li>
              {gojeeEnabled && (
                <li className="flex items-center gap-3 px-5 py-3">
                  <GojeeMark size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Gojee</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {GOJEE_ACCOUNT.name} · {GOJEE_ACCOUNT.id} · signed in with Xero
                    </div>
                  </div>
                </li>
              )}
            </ul>
            <div className="space-y-2 border-t border-border p-5">
              <Button asChild className="w-full">
                <Link href="/home">
                  Open the parallel-run dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/migration/go-live">Go-live checklist</Link>
              </Button>
            </div>
          </section>
        </div>

        <MigrationReportList scope={history} gojeeEnabled={gojeeEnabled} />
      </PageBody>
    </>
  )
}
