"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, Loader2, PartyPopper, Rocket, Sparkles } from "lucide-react"
import { SystemChip } from "@/components/brand"
import MigrationReportList from "@/components/migration/report-list"
import StepShell, { Banner } from "@/components/migration/step-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { conversionDate, formatShort, migratedThrough } from "@/lib/clock"
import { BANK_ACCOUNTS, XERO_ORG } from "@/lib/data/company"
import { completedDemoState, useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

interface Task {
  key: string
  title: string
  detail: string
  system: "xero" | "qbo"
  /** Already done by the migration */
  auto?: boolean
}

function tasks(): Task[] {
  return [
    { key: "history", title: "History migrated and validated", detail: `Trial balance, P&L, balance sheet, ageing, bank and GST all agree at ${formatShort(migratedThrough())}.`, system: "xero", auto: true },
    { key: "feeds", title: "Connect bank feeds in Xero", detail: `${BANK_ACCOUNTS.map((b) => `${b.name} (${b.feed})`).join(", ")}. Start each feed from ${formatShort(conversionDate())}.`, system: "xero" },
    { key: "lock", title: `Set a Xero lock date of ${formatShort(migratedThrough())}`, detail: "The day before the conversion date, so migrated history can't be changed by accident.", system: "xero" },
    { key: "rules", title: "Recreate bank rules", detail: "64 QuickBooks bank rules are in the archive pack, ready to set up as Xero bank rules.", system: "xero" },
    { key: "repeating", title: "Recreate repeating invoices and bills", detail: "11 recurring templates: 7 maintenance contract invoices, 4 bills (rent, software, insurance, vehicle finance).", system: "xero" },
    { key: "budgets", title: "Enter budgets", detail: "Budget CSV exported from QuickBooks, ready for Xero's budget manager.", system: "xero" },
    { key: "users", title: "Invite users to Xero", detail: `Finance team and your accountant into ${XERO_ORG.name}.`, system: "xero" },
    { key: "keep-qbo", title: "Keep QuickBooks for the parallel run", detail: "Don't cancel the QuickBooks subscription yet. Keep entering in both until AI QA shows no exceptions, then switch QuickBooks to read-only.", system: "qbo" },
  ]
}

export default function GoLivePage() {
  const router = useRouter()
  const { state, update } = useDemo()
  const { history, status, step } = state.migration
  const list = tasks()
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [starting, setStarting] = useState(false)
  const imported = status === "completed" || (status === "in-progress" && step >= 6)
  const ticked = list.filter((t) => t.auto || done[t.key]).length

  const startParallel = () => {
    setStarting(true)
    setTimeout(() => {
      update((s) => completedDemoState(s))
      router.push("/home")
    }, 700)
  }

  return (
    <StepShell
      step={6}
      title="Go live in Xero"
      description={`Xero is live from ${formatShort(conversionDate())}. Finish the checklist, download the comparative reports for your records, then start the parallel run.`}
      footerNote={`${ticked} of ${list.length} checklist items done`}
      nextSlot={
        status === "completed" ? (
          <Button size="lg" onClick={() => router.push("/home")}>
            Open dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={startParallel} disabled={!imported || starting} className="font-semibold">
            {starting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Rocket className="mr-1.5 h-4 w-4" />}
            Start parallel run
          </Button>
        )
      }
    >
      {!imported && (
        <Banner tone="warning">
          The import hasn&apos;t run yet.{" "}
          <button onClick={() => router.push("/migration/import")} className="font-semibold underline-offset-2 hover:underline">
            Go to step 5
          </button>
        </Banner>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">Go-live checklist</div>
            <span className={cn(ticked === list.length ? "pill-success" : "pill-info")}>
              <CheckCircle2 className="h-3 w-3" /> {ticked} of {list.length}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {list.map((t) => {
              const checked = !!t.auto || !!done[t.key]
              return (
                <li key={t.key}>
                  <label className={cn("flex cursor-pointer items-start gap-3 px-5 py-3", t.auto && "cursor-default")}>
                    <Checkbox checked={checked} disabled={t.auto} onCheckedChange={(v) => setDone((d) => ({ ...d, [t.key]: v === true }))} className="mt-0.5" aria-label={t.title} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium", checked && "text-muted-foreground line-through decoration-muted-foreground/40")}>{t.title}</span>
                      <span className="block text-sm text-muted-foreground">{t.detail}</span>
                    </span>
                    <SystemChip system={t.system} className="hidden sm:inline-flex" />
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel flex flex-col">
          <div className="panel-header">
            <div className="panel-title flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> What happens next
            </div>
          </div>
          <div className="flex-1 space-y-4 p-5 text-sm">
            <div className="flex gap-3">
              <PartyPopper className="h-5 w-5 shrink-0 text-primary" />
              <p>
                <span className="font-semibold">Parallel run.</span> From {formatShort(conversionDate())} you keep entering in QuickBooks and Xero. Bank feeds go into both.
              </p>
            </div>
            <div className="flex gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <p>
                <span className="font-semibold">AI QA every 2 hours.</span> Compares the two systems and the bank statement, flags anything that differs with the evidence, and emails a PDF report.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              <p>
                <span className="font-semibold">Switch-off.</span> When the tracker shows no open exceptions for a full month-end, set QuickBooks to read-only and keep the archive.
              </p>
            </div>
          </div>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            History: {history === "all" ? "all" : history === "balances" ? "opening balances only" : history === "3fy" ? "last 3 financial years" : "last 2 financial years"}
          </div>
        </section>
      </div>

      <MigrationReportList scope={history} />
    </StepShell>
  )
}
