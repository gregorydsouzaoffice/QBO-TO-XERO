"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, CircleDashed, Loader2, Play, RotateCcw, Terminal } from "lucide-react"
import { GojeeMark, XeroMark } from "@/components/brand"
import StepShell from "@/components/migration/step-shell"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatShort } from "@/lib/clock"
import { CLASS_MAP, LOCATION_MAP, TAX_CODES, scanRows, scopeWindow } from "@/lib/data/migration"
import { fmtInt } from "@/lib/format"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"

interface Category {
  key: string
  system: "xero" | "gojee"
  label: string
  count: number
  /** Sample log lines while this category runs */
  samples: string[]
}

function buildCategories(scope: Parameters<typeof scanRows>[0], gojee: boolean): Category[] {
  const rows = scanRows(scope, gojee)
  const n = (k: string) => rows.find((r) => r.key === k)?.migrating ?? 0
  const w = scopeWindow(scope)
  const xero: Category[] = [
    { key: "settings", system: "xero", label: "Tax rates and tracking categories", count: TAX_CODES.length + CLASS_MAP.length + LOCATION_MAP.length + 2, samples: ["Tax rate GST on Income (OUTPUT) matched", "Tracking category Division created with 9 options", "Tracking category Location created with 3 options"] },
    { key: "accounts", system: "xero", label: "Chart of accounts", count: n("accounts"), samples: ["Account 200 Commercial Electrical Contracts created", "Account 449 Motor Vehicle - Fuel created (from QBO 6031 sub-account)", "System account 820 GST linked to QBO 2200"] },
    { key: "contacts", system: "xero", label: "Contacts", count: n("customers") + n("vendors") + n("employees") - 13, samples: ["Contact Ironbark Developments Pty Ltd created", "Merged Coastline Builders into Coastline Builders Pty Ltd (same ABN)", "Contact Southern Cross Electrical Wholesale created"] },
    { key: "items", system: "xero", label: "Items", count: n("items-service"), samples: ["Item LAB-ELEC Electrician – standard hour created", "Item SWB-UPG Switchboard upgrade created"] },
    {
      key: "balances",
      system: "xero",
      label: w.summaryMonths ? "Conversion balances and monthly summary journals" : "Conversion balances",
      count: w.summaryMonths + 1,
      samples: w.summaryMonths ? [`Summary journal for ${formatShort(w.summaryFrom!)} posted`, "Summary journal balanced: debits equal credits", `Conversion balances at ${formatShort(w.through)} posted`] : [`Conversion balances at ${formatShort(w.through)} posted`],
    },
    { key: "invoices", system: "xero", label: "Invoices and credit notes", count: n("invoices") + n("credit-memos"), samples: ["Invoice INV-08231 created (Ironbark Developments, $18,640.00)", "Credit note CN-0211 allocated to INV-08190", "Invoice INV-08244 created (Redfern Medical Centre)"] },
    { key: "payments", system: "xero", label: "Customer payments", count: n("payments"), samples: ["Payment applied to INV-08188", "Payment applied to INV-08203"] },
    { key: "bills", system: "xero", label: "Bills and supplier credits", count: n("bills") + n("vendor-credits"), samples: ["Bill SCEW-55120 created (Southern Cross Electrical Wholesale)", "Supplier credit MCS-CR-118 allocated"] },
    { key: "bill-payments", system: "xero", label: "Bill payments", count: n("bill-payments"), samples: ["Bill payment applied to SCEW-55102", "Batch payment of 14 bills created"] },
    { key: "bank", system: "xero", label: "Bank transactions and transfers", count: n("expenses") + n("deposits") + n("transfers") + n("sales-receipts") + n("refund-receipts"), samples: ["Spend money on Westpac Business One created", "Transfer Business One → Business Saver created", "Receive money on Westpac Business One created"] },
    { key: "journals", system: "xero", label: "Manual journals", count: n("journals"), samples: ["Manual journal MJ-1204 (depreciation) created", "Manual journal MJ-1211 (accruals) created"] },
    { key: "attachments", system: "xero", label: "Attachments", count: n("attachments"), samples: ["Attached receipt to bill SCEW-55120", "Compressed site-plan.pdf from 46.2 MB to 9.4 MB", "Attached signed quote to INV-08231"] },
  ]
  const gojeeCats: Category[] = gojee
    ? [
        { key: "g-customers", system: "gojee", label: "Customers (linked from Xero)", count: 286, samples: ["Linked Gojee customer to Xero contact Ironbark Developments Pty Ltd"] },
        { key: "g-stock", system: "gojee", label: "Stock items and quantities", count: n("items-inventory"), samples: ["Stock item CAB-TPS25-100: 46 on hand at Alexandria", "Stock item DL-LED-10W: 360 on hand"] },
        { key: "g-jobs", system: "gojee", label: "Jobs (from Projects)", count: n("projects"), samples: ["Job J-2418 Alexandria warehouse fit-out – Stage 2 created", "Job J-2311 created as completed"] },
        { key: "g-quotes", system: "gojee", label: "Quotes (open estimates)", count: n("estimates"), samples: ["Quote Q-3311 created for Ironbark Developments", "Quote Q-3318 created"] },
        { key: "g-pos", system: "gojee", label: "Purchase orders (open)", count: n("purchase-orders"), samples: ["PO-1702 linked to job J-2418 (partly received)", "PO-1705 linked to job J-2437"] },
        { key: "g-time", system: "gojee", label: "Timesheets", count: n("time"), samples: ["Timesheets for J-2418 imported", "Timesheets for J-2437 imported"] },
      ]
    : []
  return [...xero, ...gojeeCats].filter((c) => c.count > 0)
}

interface LogLine {
  id: number
  time: string
  system: "xero" | "gojee"
  text: string
  done?: boolean
}

const TICK_MS = 110

export default function ImportPage() {
  const router = useRouter()
  const { state, update, hydrated } = useDemo()
  const { history, gojeeEnabled, status, step } = state.migration
  const cats = useMemo(() => buildCategories(history, gojeeEnabled), [history, gojeeEnabled])
  const alreadyDone = status === "completed" || (status === "in-progress" && step >= 6)

  const [phase, setPhase] = useState<"ready" | "running" | "done">(alreadyDone ? "done" : "ready")
  const [idx, setIdx] = useState(alreadyDone ? cats.length : 0)
  const [progressIn, setProgressIn] = useState(0)
  const [log, setLog] = useState<LogLine[]>([])
  const logId = useRef(0)
  const logBox = useRef<HTMLDivElement>(null)
  const startedIdx = useRef(-1)

  // After a full page reload the saved state arrives a moment later
  useEffect(() => {
    if (hydrated && alreadyDone && phase === "ready") {
      setPhase("done")
      setIdx(cats.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, alreadyDone])

  const push = (system: "xero" | "gojee", text: string, done = false) => {
    logId.current += 1
    const line = { id: logId.current, time: new Date().toLocaleTimeString("en-AU", { hour12: false }), system, text, done }
    setLog((l) => [...l.slice(-80), line])
  }

  // Animation: each category runs for a number of ticks scaled to its size
  useEffect(() => {
    if (phase !== "running") return
    if (idx >= cats.length) {
      setPhase("done")
      push(gojeeEnabled ? "gojee" : "xero", "Import complete. Xero trial balance agrees with QuickBooks at the conversion date.", true)
      update((s) => ({ ...s, migration: { ...s.migration, status: s.migration.status === "completed" ? "completed" : "in-progress", step: 6 } }))
      return
    }
    const c = cats[idx]
    const ticks = Math.max(5, Math.min(18, Math.round(Math.log10(c.count + 1) * 4.5)))
    if (progressIn === 0 && startedIdx.current !== idx) {
      startedIdx.current = idx
      push(c.system, `${c.label}: importing ${fmtInt(c.count)}…`)
    }
    const t = setTimeout(() => {
      const next = progressIn + 1
      const every = Math.max(1, Math.ceil(ticks / (c.samples.length + 1)))
      const sample = next % every === 0 ? c.samples[next / every - 1] : undefined
      if (sample && next < ticks) push(c.system, sample)
      if (next >= ticks) {
        push(c.system, `${c.label}: ${fmtInt(c.count)} done`, true)
        setProgressIn(0)
        setIdx((i) => i + 1)
      } else setProgressIn(next)
    }, TICK_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, progressIn, cats])

  useEffect(() => {
    if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight
  }, [log])

  const ticksFor = (c: Category) => Math.max(5, Math.min(18, Math.round(Math.log10(c.count + 1) * 4.5)))
  const doneCount = (i: number) => (i < idx ? cats[i].count : i === idx && phase === "running" ? Math.round((progressIn / ticksFor(cats[i])) * cats[i].count) : 0)
  const totalAll = cats.reduce((t, c) => t + c.count, 0)
  const totalDone = phase === "done" ? totalAll : cats.reduce((t, _c, i) => t + doneCount(i), 0)
  const xeroTotal = cats.filter((c) => c.system === "xero").reduce((t, c) => t + c.count, 0)
  const gojeeTotal = totalAll - xeroTotal

  const start = () => {
    startedIdx.current = -1
    setLog([])
    setIdx(0)
    setProgressIn(0)
    push("xero", `Connected to Xero organisation and QuickBooks company. ${scopeWindow(history).describe}.`)
    setPhase("running")
  }

  return (
    <StepShell
      step={5}
      title="Import into Xero and Gojee"
      description={gojeeEnabled ? "The ledger goes into Xero first, then Gojee picks up customers from Xero and adds stock, jobs, quotes, purchase orders and timesheets." : "Everything goes into Xero. Gojee is switched off, so projects, estimates, POs and inventory quantities are archived."}
      next={{ to: "Go live", onClick: () => router.push("/migration/go-live"), disabled: phase !== "done" }}
      footerNote={phase === "done" ? `${fmtInt(totalAll)} records imported` : phase === "running" ? "Importing…" : undefined}
    >
      <section className="panel p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{phase === "done" ? "Import finished" : phase === "running" ? "Importing" : "Ready to import"}</div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums">
              {fmtInt(totalDone)} <span className="text-base font-medium text-muted-foreground">of {fmtInt(totalAll)} records</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5">
                <XeroMark size={14} /> {fmtInt(xeroTotal)} to Xero
              </span>
              {gojeeEnabled && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5">
                  <GojeeMark size={14} /> {fmtInt(gojeeTotal)} to Gojee
                </span>
              )}
            </div>
          </div>
          {phase === "ready" && (
            <Button size="lg" onClick={start}>
              <Play className="mr-1.5 h-4 w-4" /> Start import
            </Button>
          )}
          {phase === "running" && (
            <span className="pill-info">
              <Loader2 className="h-3 w-3 animate-spin" /> {cats[idx]?.label ?? "Finishing"}
            </span>
          )}
          {phase === "done" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="pill-success">
                <CheckCircle2 className="h-3 w-3" /> Complete
              </span>
              {status !== "completed" && (
                <Button variant="ghost" size="sm" onClick={start}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Replay
                </Button>
              )}
            </div>
          )}
        </div>
        <Progress value={totalAll ? (totalDone / totalAll) * 100 : 0} className="mt-4 h-2.5" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title">By category</div>
            <span className="text-xs text-muted-foreground">Xero first, then Gojee</span>
          </div>
          <ul className="divide-y divide-border">
            {cats.map((c, i) => {
              const d = phase === "done" ? c.count : doneCount(i)
              const pct = c.count ? (d / c.count) * 100 : 0
              const state = phase === "done" || i < idx ? "done" : i === idx && phase === "running" ? "running" : "waiting"
              const firstGojee = c.system === "gojee" && cats[i - 1]?.system !== "gojee"
              return (
                <li key={c.key} className={cn("px-5 py-3", firstGojee && "border-t-2 border-t-border")}>
                  <div className="flex items-center gap-3">
                    {c.system === "xero" ? <XeroMark size={18} /> : <GojeeMark size={18} />}
                    <span className={cn("min-w-0 flex-1 truncate text-sm", state === "waiting" ? "text-muted-foreground" : "font-medium")}>{c.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fmtInt(d)} / {fmtInt(c.count)}
                    </span>
                    {state === "done" ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Done" /> : state === "running" ? <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Running" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" aria-label="Waiting" />}
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel flex flex-col">
          <div className="panel-header">
            <div className="panel-title flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" /> Live log
            </div>
            <span className="text-xs text-muted-foreground">{log.length} lines</span>
          </div>
          <div ref={logBox} className="h-[420px] overflow-y-auto bg-[#0b1d33] px-4 py-3 font-mono text-[12px] leading-relaxed text-white/85" aria-live="polite">
            {log.length === 0 ? (
              <p className="text-white/50">{phase === "done" ? "Import already finished. Replay to watch it again." : "Waiting to start…"}</p>
            ) : (
              log.map((l) => (
                <div key={l.id} className="flex gap-2">
                  <span className="shrink-0 text-white/40">{l.time}</span>
                  <span className={cn("shrink-0 font-semibold", l.system === "xero" ? "text-[#13b5ea]" : "text-[#a8d4b9]")}>{l.system === "xero" ? "xero " : "gojee"}</span>
                  <span className={cn(l.done && "text-[#7ee2a8]")}>{l.text}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </StepShell>
  )
}
