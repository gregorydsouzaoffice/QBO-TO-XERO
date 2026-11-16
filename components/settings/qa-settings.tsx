"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Clock3, Lock, Mail, PauseCircle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { formatTime } from "@/lib/clock"
import { QA_RECIPIENTS } from "@/lib/data/company"
import { openIssues } from "@/lib/data/issues"
import { nextRunAt } from "@/lib/data/schedule"
import { useDemo } from "@/lib/demo-store"
import { fmtMoney } from "@/lib/format"
import { AREAS, CHECKS, dailyRunTimes } from "@/lib/qa/engine"
import { cn } from "@/lib/utils"

interface Recipient {
  name: string
  email: string
  role: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function QaSettings() {
  const { state } = useDemo()
  const [recipients, setRecipients] = useState<Recipient[]>(() => QA_RECIPIENTS.map((r) => ({ ...r })))
  const [draft, setDraft] = useState({ name: "", email: "" })
  const [error, setError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState("1.00")
  const [areas, setAreas] = useState<Record<string, boolean>>(() => Object.fromEntries(AREAS.map((a) => [a.key, true])))
  const [delivery, setDelivery] = useState({ pdf: true, xlsx: false, onlyWhenExceptions: false })
  const [next, setNext] = useState(() => nextRunAt())

  useEffect(() => {
    const id = setInterval(() => setNext(nextRunAt()), 30_000)
    return () => clearInterval(id)
  }, [])

  const times = useMemo(() => dailyRunTimes(), [])
  const paused = !state.qbo.connected || !state.xero.connected
  const t = Number(threshold)
  const open = openIssues()
  const belowThreshold = Number.isFinite(t) ? open.filter((i) => i.amount < t) : []
  const enabledChecks = CHECKS.filter((c) => areas[c.area]).length

  const addRecipient = () => {
    const email = draft.email.trim().toLowerCase()
    const name = draft.name.trim() || email.split("@")[0]
    if (!EMAIL_RE.test(email)) return setError("Enter a valid email address.")
    if (recipients.some((r) => r.email === email)) return setError("That address already receives the report.")
    setRecipients((r) => [...r, { name, email, role: "Added in this session" }])
    setDraft({ name: "", email: "" })
    setError(null)
    toast.success(`${name} will receive the QA report`, { description: "From the next run (simulated)." })
  }

  return (
    <section className="panel scroll-mt-20" id="qa">
      <div className="panel-header flex-wrap">
        <div>
          <div className="panel-title">AI QA settings</div>
          <div className="text-xs text-muted-foreground">When the engine runs, who gets the report and what it checks.</div>
        </div>
        {paused ? (
          <span className="pill-warning">
            <PauseCircle className="h-3 w-3" /> Paused: {!state.qbo.connected ? "QuickBooks" : "Xero"} not connected
          </span>
        ) : (
          <span className="pill-success">
            <CheckCircle2 className="h-3 w-3" /> Running every 2 hours
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Frequency */}
        <div className="grid gap-4 p-5 md:grid-cols-[240px_1fr]">
          <div>
            <div className="font-semibold">Frequency</div>
            <p className="text-xs text-muted-foreground">Fixed for the parallel run, as agreed in the requirements.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lock className="h-4 w-4 text-muted-foreground" /> Every 2 hours, around the clock
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Daily run times">
              {times.map((d) => {
                const isNext = d.getHours() === next.getHours()
                return (
                  <li key={d.getHours()} className={cn("rounded-md border px-2 py-1 text-xs tabular-nums", isNext ? "border-primary bg-accent font-semibold text-primary" : "border-border text-muted-foreground")}>
                    {formatTime(d)}
                    {isNext && " · next"}
                  </li>
                )
              })}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> Sydney time in production. Each run takes about 2 minutes, and the email goes out when it finishes.
            </p>
          </div>
        </div>

        {/* Recipients */}
        <div className="grid gap-4 p-5 md:grid-cols-[240px_1fr]">
          <div>
            <div className="font-semibold">Recipients</div>
            <p className="text-xs text-muted-foreground">Everyone here gets the email and PDF after each run.</p>
          </div>
          <div className="space-y-3">
            <ul className="divide-y divide-border rounded-lg border border-border">
              {recipients.map((r) => (
                <li key={r.email} className="flex items-center gap-3 px-3 py-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {r.name} <span className="font-normal text-muted-foreground">· {r.role}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${r.name}`}
                    disabled={recipients.length === 1}
                    onClick={() => {
                      setRecipients((list) => list.filter((x) => x.email !== r.email))
                      toast(`${r.name} removed`, { description: "They will not receive the next report." })
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Remove</span>
                  </Button>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} aria-label="Recipient name" />
              <Input
                placeholder="email@company.com.au"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                aria-label="Recipient email"
                aria-invalid={!!error}
              />
              <Button variant="outline" onClick={addRecipient}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
                <AlertTriangle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={delivery.pdf} onCheckedChange={(v) => setDelivery((d) => ({ ...d, pdf: v }))} /> Attach the PDF report
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={delivery.xlsx} onCheckedChange={(v) => setDelivery((d) => ({ ...d, xlsx: v }))} /> Also attach Excel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={delivery.onlyWhenExceptions} onCheckedChange={(v) => setDelivery((d) => ({ ...d, onlyWhenExceptions: v }))} /> Skip the email when nothing changed
              </label>
            </div>
          </div>
        </div>

        {/* Materiality */}
        <div className="grid gap-4 p-5 md:grid-cols-[240px_1fr]">
          <div>
            <Label htmlFor="materiality" className="font-semibold">
              Materiality threshold
            </Label>
            <p className="text-xs text-muted-foreground">Differences below this amount are logged as rounding, not raised as exceptions.</p>
          </div>
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input id="materiality" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/[^0-9.]/g, ""))} className="w-32 tabular-nums" />
              <span className="text-sm text-muted-foreground">per difference</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {Number.isFinite(t)
                ? `At $${fmtMoney(t)}, ${belowThreshold.length} of the ${open.length} open exceptions would be logged only${belowThreshold.length ? ` (${belowThreshold.map((i) => i.id).join(", ")})` : ""}. Missing entries, duplicates and feed gaps are always raised, whatever their size.`
                : "Enter an amount."}
            </p>
          </div>
        </div>

        {/* Areas */}
        <div className="grid gap-4 p-5 md:grid-cols-[240px_1fr]">
          <div>
            <div className="font-semibold">What to check</div>
            <p className="text-xs text-muted-foreground">
              {enabledChecks} of {CHECKS.length} checks enabled.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {AREAS.map((a) => {
              const n = CHECKS.filter((c) => c.area === a.key).length
              const on = areas[a.key]
              return (
                <li key={a.key} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Switch
                    id={`area-${a.key}`}
                    checked={on}
                    onCheckedChange={(v) => {
                      if (!v && Object.values(areas).filter(Boolean).length === 1) return toast.error("Keep at least one area switched on.")
                      setAreas((s) => ({ ...s, [a.key]: v }))
                    }}
                  />
                  <label htmlFor={`area-${a.key}`} className="min-w-0 cursor-pointer">
                    <span className="block text-sm font-medium">{a.responsibility}</span>
                    <span className="block text-xs text-muted-foreground">
                      {n} checks · {on ? "On" : "Off"}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
        <span className="text-xs text-muted-foreground">Changes apply from the next run at {formatTime(next)}.</span>
        <Button onClick={() => toast.success("AI QA settings saved", { description: "Kept for this demo session only." })}>Save QA settings</Button>
      </div>
    </section>
  )
}
