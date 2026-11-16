"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Landmark } from "lucide-react"
import { Money } from "@/components/figures"
import { Button } from "@/components/ui/button"
import ExportButtons from "@/components/reports/export-buttons"
import { conversionDate, formatDate, formatShort, formatTime, todayISO } from "@/lib/clock"
import { bankSummary, bankTransactions, feedStatuses, type MatchStatus } from "@/lib/data/bank"
import { BANK_ACCOUNTS } from "@/lib/data/company"
import { ACCOUNT_BY_CODE } from "@/lib/data/chart"
import { MATCH_LABEL, QBO_STATUS_LABEL, XERO_STATUS_LABEL, accountName } from "@/lib/tracker/bank"
import { bankReport, trackerCtx, trackerFile } from "@/lib/tracker/exports"
import { DateInput, FilterBar, FilterSelect, SearchInput } from "./filters"
import { CodeTrace, IssueLinks, MatchPill } from "./pills"
import { cn } from "@/lib/utils"

const PAGE = 50
type MatchFilter = "all" | "exceptions" | MatchStatus

export default function BankTab() {
  const all = bankTransactions()
  const start = conversionDate()
  const today = todayISO()
  const [account, setAccount] = useState<string>("all")
  const [match, setMatch] = useState<MatchFilter>("all")
  const [q, setQ] = useState("")
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(today)
  const [limit, setLimit] = useState(PAGE)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter((t) => {
      if (account !== "all" && t.account !== account) return false
      if (match === "exceptions" && (t.match === "matched" || t.match === "pending")) return false
      if (match !== "all" && match !== "exceptions" && t.match !== match) return false
      if (t.date < from || t.date > to) return false
      if (term && !`${t.description} ${t.statementRef} ${t.qbo.id ?? ""} ${t.xero.id ?? ""} ${t.issueId ?? ""} ${t.amount}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [all, account, match, q, from, to])

  const active = account !== "all" || match !== "all" || q !== "" || from !== start || to !== today
  const clear = () => {
    setAccount("all")
    setMatch("all")
    setQ("")
    setFrom(start)
    setTo(today)
  }

  return (
    <div className="space-y-6">
      <AccountCards selected={account} onSelect={(c) => { setAccount(c === account ? "all" : c); setLimit(PAGE) }} />

      <section className="panel">
        <div className="panel-header flex-wrap">
          <div>
            <div className="panel-title">Bank and card transactions</div>
            <div className="text-xs text-muted-foreground">Bank statement ↔ QuickBooks ↔ Xero, since {formatShort(start)}</div>
          </div>
          <ExportButtons compact build={() => ({ reports: [bankReport(rows)], ctx: trackerCtx("Bank statement vs QuickBooks vs Xero", from, to), name: trackerFile("bank") })} />
        </div>
        <FilterBar count={rows.length} total={all.length} onClear={clear} active={active}>
          <FilterSelect label="Account" value={account} onChange={(v) => { setAccount(v); setLimit(PAGE) }} options={[{ value: "all", label: "All accounts" }, ...BANK_ACCOUNTS.map((b) => ({ value: b.code, label: b.name }))]} />
          <FilterSelect<MatchFilter>
            label="Match status"
            value={match}
            onChange={(v) => { setMatch(v); setLimit(PAGE) }}
            options={[{ value: "all", label: "All statuses" }, { value: "exceptions", label: "Exceptions only" }, ...(Object.keys(MATCH_LABEL) as MatchStatus[]).map((k) => ({ value: k, label: MATCH_LABEL[k] }))]}
          />
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE) }} placeholder="Payee, reference, amount" className="col-span-2" />
          <DateInput label="From" value={from} min={start} max={to} onChange={(v) => setFrom(v || start)} />
          <DateInput label="To" value={to} min={from} max={today} onChange={(v) => setTo(v || today)} />
        </FilterBar>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>Bank statement</th>
                <th>QuickBooks</th>
                <th>Xero</th>
                <th>Match</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t) => {
                const coded = ACCOUNT_BY_CODE[t.coding]
                const exception = t.match !== "matched" && t.match !== "pending"
                return (
                  <tr key={t.id} className={cn(exception && "bg-destructive/[0.03]")}>
                    <td className="whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="whitespace-nowrap text-xs">{accountName(t.account)}</td>
                    <td>
                      <div className="font-medium">{t.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {coded?.name} · <CodeTrace qbo={t.coding} xero={coded?.xeroCode} />
                      </div>
                    </td>
                    <td className={cn("num whitespace-nowrap font-medium", t.amount > 0 && "text-success")}>
                      <Money value={t.amount} />
                    </td>
                    <td className="whitespace-nowrap font-mono text-xs">{t.statementRef}</td>
                    <td className="whitespace-nowrap text-xs">
                      <div className="font-mono">{t.qbo.id ?? "—"}</div>
                      <div className={cn(t.qbo.status === "missing" ? "text-destructive" : "text-muted-foreground")}>{QBO_STATUS_LABEL[t.qbo.status]}</div>
                    </td>
                    <td className="whitespace-nowrap text-xs">
                      <div className="font-mono">{t.xero.id ?? "—"}</div>
                      <div className={cn(t.xero.status === "missing" || t.xero.status === "duplicate" ? "text-destructive" : t.xero.status === "unreconciled" ? "text-warning" : "text-muted-foreground")}>{XERO_STATUS_LABEL[t.xero.status]}</div>
                    </td>
                    <td>
                      <MatchPill match={t.match} />
                    </td>
                    <td>
                      <IssueLinks ids={t.issueId ? [t.issueId] : []} />
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div className="flex justify-center border-t border-border p-3">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, rows.length - limit)} more ({rows.length - limit} left)
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function AccountCards({ selected, onSelect }: { selected: string; onSelect: (code: string) => void }) {
  const summary = bankSummary()
  const feeds = feedStatuses()
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {summary.map((s) => {
        const feed = feeds.find((f) => f.code === s.code)!
        const on = selected === s.code
        return (
          <button key={s.code} onClick={() => onSelect(s.code)} aria-pressed={on} className={cn("panel p-4 text-left transition-colors hover:border-primary/40", on && "border-primary ring-1 ring-primary")}>
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <CodeTrace qbo={s.code} xero={ACCOUNT_BY_CODE[s.code].xeroCode} />
                </span>
              </span>
              {feed.status === "connected" ? (
                <span className="pill-success shrink-0"><CheckCircle2 className="h-3 w-3" /> Feed OK</span>
              ) : (
                <span className="pill-warning shrink-0"><AlertTriangle className="h-3 w-3" /> Feed gap</span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 py-1.5">
                <dt className="text-[11px] text-muted-foreground">Matched</dt>
                <dd className="font-bold tabular-nums">{s.matched}</dd>
              </div>
              <div className="rounded-md bg-muted/50 py-1.5">
                <dt className="text-[11px] text-muted-foreground">Waiting</dt>
                <dd className="font-bold tabular-nums">{s.pending}</dd>
              </div>
              <div className={cn("rounded-md py-1.5", s.exceptions ? "bg-destructive/10 text-destructive" : "bg-muted/50")}>
                <dt className="text-[11px]">Exceptions</dt>
                <dd className="font-bold tabular-nums">{s.exceptions}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              {feed.feed} · refreshed {formatTime(feed.lastRefresh)} · {feed.note}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{s.unreconciledXero} lines unreconciled in Xero</p>
          </button>
        )
      })}
      <p className="text-xs text-muted-foreground md:col-span-3">
        Select an account card to filter the table. Rows with an exception link to the discrepancy that explains them, e.g. <Link href="/tracker?tab=exceptions" className="text-primary hover:underline">all discrepancies</Link>.
      </p>
    </section>
  )
}
