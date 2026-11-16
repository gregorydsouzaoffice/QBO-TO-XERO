"use client"

import Link from "next/link"
import { useMemo } from "react"
import { AlertTriangle, ArrowRight, Banknote, CheckCircle2, CircleDot, FastForward, Landmark, Scale, ShieldCheck, Sparkles, TrendingUp, Wallet } from "lucide-react"
import { GojeeMark, QuickBooksLogo, QuickBooksMark, SystemChip, XeroMark, XeroWordmark, GojeeLogo } from "@/components/brand"
import { TrendChart } from "@/components/charts"
import { Delta, Money, StatTile, fmtWhole } from "@/components/figures"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import ViewSelector from "@/components/shell/view-selector"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { conversionDate, formatShort, formatTime, parallelRunDay, periodRange, todayISO } from "@/lib/clock"
import { feedStatuses } from "@/lib/data/bank"
import { COMPANY, GOJEE_ACCOUNT, QBO_COMPANY, USER, XERO_ORG } from "@/lib/data/company"
import { KIND_LABEL, SEVERITY_ORDER, issues } from "@/lib/data/issues"
import { bankBalances, monthlyTrend, plTotals } from "@/lib/data/ledger"

function monthsLabel(from: string, to: string) {
  const n = periodRange(from.slice(0, 7), to.slice(0, 7)).length
  const y = Math.floor(n / 12)
  return y >= 2 ? `${y} years` : `${n} months`
}
import { lastRunAt, untilNextRun } from "@/lib/data/schedule"
import { completedDemoState, useDemo } from "@/lib/demo-store"

const RECOMMENDED_PARALLEL_DAYS = 60

export default function HomePage() {
  const { state, update, hydrated } = useDemo()
  if (!hydrated) return null
  if (state.migration.status !== "completed") return <Onboarding onSkip={() => update((s) => completedDemoState(s))} />
  return <Dashboard />
}

// ---------------------------------------------------------------------------
// Before migration: onboarding

const STEPS = [
  { title: "Connect", text: "QuickBooks Online (Intuit sign-in), Xero and Gojee" },
  { title: "Scope", text: "How much history, and the conversion date" },
  { title: "Map", text: "Accounts, GST codes, tracking, items and projects" },
  { title: "Validate", text: "Trial balance, P&L, balance sheet and ageing per period" },
  { title: "Import", text: "Into Xero and Gojee, with a full audit log" },
  { title: "Go live", text: "Bank feeds, checklist, then the parallel run starts" },
]

function Onboarding({ onSkip }: { onSkip: () => void }) {
  const { state } = useDemo()
  const step = state.migration.status === "in-progress" || state.migration.step > 1 ? state.migration.step : 0
  return (
    <>
      <PageHeader eyebrow={`Welcome, ${USER.name.split(" ")[0]}`} title={`Move ${COMPANY.short} from QuickBooks to Xero`} description="Start with the migration. Once Xero is live, this page becomes your financial dashboard, and the AI QA engine checks QuickBooks against Xero every 2 hours." />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 border-b border-border bg-accent/40 px-6 py-5">
              <QuickBooksLogo height={30} />
              <ArrowRight className="h-5 w-5 text-primary" />
              <XeroWordmark height={24} />
              <span className="text-muted-foreground">+</span>
              <GojeeLogo height={26} />
            </div>
            <ol className="divide-y divide-border">
              {STEPS.map((s, i) => {
                const done = i + 1 < step
                const current = i + 1 === step || (step === 0 && i === 0)
                return (
                  <li key={s.title} className="flex items-center gap-4 px-6 py-3.5">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-success text-white" : current ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{s.title}</div>
                      <div className="text-sm text-muted-foreground">{s.text}</div>
                    </div>
                  </li>
                )
              })}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
              <button onClick={onSkip} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                <FastForward className="h-4 w-4" /> Demo: skip to the parallel run
              </button>
              <Button asChild size="lg">
                <Link href={step > 0 ? "/migration" : "/migration/connect"}>
                  {step > 0 ? "Continue migration" : "Start migration"} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            {[
              { icon: Landmark, title: "Financial Tracker", text: "Bank transactions, figures, reconciliation status, source dependencies and discrepancies, QuickBooks against Xero." },
              { icon: TrendingUp, title: "Reporting", text: "Current YTD, Previous FY and Since Inception, with comparisons, trends and variances." },
              { icon: Sparkles, title: "AI Financial QA", text: "Verifies every figure against its source, flags exceptions with evidence and emails the report every 2 hours." },
            ].map((c) => (
              <div key={c.title} className="panel flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold">{c.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.text}</p>
                  <span className="mt-2 inline-block text-xs font-medium text-muted-foreground">Available once Xero is live</span>
                </div>
              </div>
            ))}
          </section>
        </div>
      </PageBody>
    </>
  )
}

// ---------------------------------------------------------------------------
// After go-live: dashboard

function Dashboard() {
  const { range } = useDemo()
  const today = todayISO()
  const data = useMemo(() => {
    const x = plTotals(range.from, range.to, "xero")
    const q = plTotals(range.from, range.to, "qbo")
    const c = range.compare ? plTotals(range.compare.from, range.compare.to, "xero") : null
    const trend = monthlyTrend(range.from, range.to, "xero")
    const prior = range.compare ? monthlyTrend(range.compare.from, range.compare.to, "xero") : []
    const chart = trend.map((t, i) => ({ label: t.label, current: t.income, ...(prior[i] ? { prior: prior[i].income } : {}) }))
    const banks = bankBalances(today)
    return { x, q, c, chart, banks }
  }, [range, today])

  const all = issues()
  const open = all.filter((i) => i.status !== "resolved").sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const high = open.filter((i) => i.severity === "high").length
  const day = parallelRunDay()
  const cash = data.banks.filter((b) => b.code !== "2110").reduce((t, b) => t + b.xero, 0)
  const cashQbo = data.banks.filter((b) => b.code !== "2110").reduce((t, b) => t + b.qbo, 0)
  const npDiff = data.x.netProfit - data.q.netProfit
  const last = lastRunAt()
  const longRange = range.key === "inception"

  return (
    <>
      <PageHeader eyebrow={COMPANY.name} title="Home" description={`Xero is live. QuickBooks and Xero have run in parallel for ${day} days, and the AI QA engine compares them every 2 hours.`} actions={<ViewSelector />} />
      <PageBody>
        {/* Parallel run status */}
        <section className="panel flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <QuickBooksMark size={36} />
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
            <XeroMark size={36} />
            <GojeeMark size={32} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">Parallel run · day {day}</span>
              <span className="pill-info">
                <CircleDot className="h-3 w-3" /> Xero live since {formatShort(conversionDate())}
              </span>
              {open.length === 0 ? <span className="pill-success"><CheckCircle2 className="h-3 w-3" /> Ready to switch off QuickBooks</span> : <span className="pill-warning"><AlertTriangle className="h-3 w-3" /> {open.length} open exceptions before switch-off</span>}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={Math.min(100, (day / RECOMMENDED_PARALLEL_DAYS) * 100)} className="h-2" />
              <span className="shrink-0 text-xs text-muted-foreground">{Math.min(day, RECOMMENDED_PARALLEL_DAYS)} of {RECOMMENDED_PARALLEL_DAYS} recommended days</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" asChild>
              <Link href="/tracker">Open tracker</Link>
            </Button>
            <Button asChild>
              <Link href="/qa">
                <Sparkles className="mr-1.5 h-4 w-4" /> Latest QA report
              </Link>
            </Button>
          </div>
        </section>

        {/* KPIs for the selected view */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={`Revenue · ${range.short}`}
            value={<Money value={data.x.income} whole />}
            icon={<TrendingUp className="h-4 w-4" />}
            sub={data.c ? <span className="flex items-center gap-1.5"><Delta current={data.x.income} previous={data.c.income} /> vs {range.compare!.label}</span> : `${monthsLabel(range.from, range.to)} of trading`}
          />
          <StatTile
            label={`Gross profit · ${data.x.grossMargin.toFixed(1)}% margin`}
            value={<Money value={data.x.grossProfit} whole />}
            icon={<Scale className="h-4 w-4" />}
            sub={data.c ? <span className="flex items-center gap-1.5"><Delta current={data.x.grossProfit} previous={data.c.grossProfit} /> vs {range.compare!.label}</span> : "Since the QuickBooks file was opened"}
          />
          <StatTile
            label="Net profit (Xero)"
            value={<Money value={data.x.netProfit} whole />}
            icon={<Wallet className="h-4 w-4" />}
            tone={Math.abs(npDiff) > 1 ? "warning" : "success"}
            sub={Math.abs(npDiff) > 1 ? <>QuickBooks shows <Money value={data.q.netProfit} whole />, a difference of {fmtWhole(npDiff)}</> : "Agrees with QuickBooks"}
          />
          <StatTile
            label="Cash in bank today (Xero)"
            value={<Money value={cash} whole />}
            icon={<Banknote className="h-4 w-4" />}
            tone={Math.abs(cash - cashQbo) > 1 ? "warning" : "success"}
            sub={Math.abs(cash - cashQbo) > 1 ? <>QuickBooks shows <Money value={cashQbo} whole /></> : "Agrees with QuickBooks and the bank"}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Monthly revenue</div>
                <div className="text-xs text-muted-foreground">{range.label} · Xero{range.compare ? `, compared with ${range.compare.label}` : ""}</div>
              </div>
              <Link href="/reports" className="text-sm font-medium text-primary hover:underline">
                Full reports
              </Link>
            </div>
            <div className="p-4">
              <TrendChart data={data.chart} series={[{ key: "current", label: range.short }, ...(range.compare && !longRange ? [{ key: "prior", label: range.compare.label, dashed: true }] : [])]} height={280} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Financial QA
              </div>
              <span className="text-xs text-muted-foreground" suppressHydrationWarning>Next run in {untilNextRun()}</span>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground" suppressHydrationWarning>Last run {formatTime(last)} today</div>
                  <div className="mt-1 text-3xl font-bold tabular-nums">{open.length}</div>
                  <div className="text-sm text-muted-foreground">open exceptions</div>
                </div>
                <div className="flex gap-2 text-center text-xs">
                  {(["high", "medium", "low"] as const).map((s) => (
                    <div key={s} className={`rounded-lg px-3 py-2 ${s === "high" ? "bg-destructive/10 text-destructive" : s === "medium" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
                      <div className="text-lg font-bold tabular-nums">{open.filter((i) => i.severity === s).length}</div>
                      <div className="capitalize">{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {open.slice(0, 4).map((i) => (
                  <li key={i.id}>
                    <Link href={`/qa/exceptions/${i.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${i.severity === "high" ? "bg-destructive" : i.severity === "medium" ? "bg-warning" : "bg-muted-foreground"}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{i.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {i.id} · {KIND_LABEL[i.kind]} · <span className="capitalize">{i.severity}</span>
                        </span>
                      </span>
                      {i.amount > 0 && <Money value={i.amount} className="text-sm" />}
                    </Link>
                  </li>
                ))}
              </ul>
              {high > 0 && <p className="text-xs text-muted-foreground">{high} high-severity items need attention before QuickBooks can be switched off.</p>}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">Bank & card balances today</div>
              <Link href="/tracker?tab=bank" className="text-sm font-medium text-primary hover:underline">
                Bank tracker
              </Link>
            </div>
            <div className="table-wrap">
            <table className="data-table min-w-[480px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">QuickBooks</th>
                  <th className="num">Xero</th>
                  <th className="num">Difference</th>
                </tr>
              </thead>
              <tbody>
                {data.banks.map((b) => {
                  const diff = b.xero - b.qbo
                  return (
                    <tr key={b.code}>
                      <td>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">
                          QBO {b.code} · Xero {b.xeroCode}
                        </div>
                      </td>
                      <td className="num"><Money value={b.qbo} /></td>
                      <td className="num"><Money value={b.xero} /></td>
                      <td className="num">{Math.abs(diff) < 0.01 ? <span className="pill-success"><CheckCircle2 className="h-3 w-3" /> Agrees</span> : <span className="font-semibold text-destructive"><Money value={diff} /></span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">Connections</div>
              <Link href="/settings" className="text-sm font-medium text-primary hover:underline">
                Manage
              </Link>
            </div>
            <ul className="divide-y divide-border">
              <ConnectionRow system="qbo" name={`QuickBooks Online · ${QBO_COMPANY.edition.replace("QuickBooks Online ", "")}`} detail={`Realm ${QBO_COMPANY.realmId} · read-only for the parallel run`} status="Synced" />
              <ConnectionRow system="xero" name={`Xero · ${XERO_ORG.plan}`} detail={`${XERO_ORG.name} · ${XERO_ORG.shortCode}`} status="Live" />
              <ConnectionRow system="gojee" name="Gojee" detail={`${GOJEE_ACCOUNT.name} · signed in with Xero`} status="Synced" />
              {feedStatuses().map((f) => (
                <li key={f.code} className="flex items-center gap-3 px-5 py-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Landmark className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{f.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{f.feed} · {f.note}</div>
                  </div>
                  {f.status === "connected" ? <span className="pill-success"><CheckCircle2 className="h-3 w-3" /> Connected</span> : <span className="pill-warning"><AlertTriangle className="h-3 w-3" /> Gap found</span>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Every figure on this page is drawn from QuickBooks, Xero or the bank statement and is traceable in the Tracker. Open items: {open.map((i) => i.id).join(", ")}.
        </p>
      </PageBody>
    </>
  )
}

function ConnectionRow({ system, name, detail, status }: { system: "qbo" | "xero" | "gojee"; name: string; detail: string; status: string }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {system === "qbo" ? <QuickBooksMark size={28} /> : system === "xero" ? <XeroMark size={28} /> : <GojeeMark size={28} />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      <SystemChip system={system} label={status} />
    </li>
  )
}
