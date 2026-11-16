"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Download, ExternalLink, FileText, Info, Loader2, Paperclip, Reply, Star } from "lucide-react"
import { PoweredBy } from "@/components/brand"
import { Money } from "@/components/figures"
import { brand } from "@/lib/brand"
import { formatDateTime, formatShort, formatTime, isoOf } from "@/lib/clock"
import { COMPANY, QA_RECIPIENTS } from "@/lib/data/company"
import { KIND_LABEL, type Issue, type IssueStatus } from "@/lib/data/issues"
import { nextRunAt } from "@/lib/data/schedule"
import { downloadBlob } from "@/lib/csv"
import { qaFileName, runHeadline } from "@/lib/qa/report"
import type { RunResult } from "@/lib/qa/types"
import { cn } from "@/lib/utils"
import { qaPdfBlob } from "./downloads"
import { SeverityPill } from "./status"

export function emailSubject(run: RunResult): string {
  const high = run.bySeverity.high
  const tail = high ? `${high} high-priority exception${high === 1 ? "" : "s"}` : run.exceptions.length ? `${run.exceptions.length} open exceptions, none high priority` : "all checks passed"
  return `AI QA report · ${COMPANY.short} · ${formatShort(isoOf(run.at))}, ${formatTime(run.at)} · ${tail}`
}

const senderAddress = () => `qa@${brand.domain.replace(/^app\./, "")}`

/** First sentence of a finding, for a one-line summary */
function oneLine(text: string): string {
  const m = text.match(/^(.+?[.!?])(\s|$)/)
  return m ? m[1] : text
}

export function EmailPreview({ run, statusOf }: { run: RunResult; statusOf: (i: Issue) => IssueStatus }) {
  const [pdf, setPdf] = useState<{ url: string; size: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const sent = new Date(run.at.getTime() + run.durationSec * 1000)
  const top = run.exceptions.slice(0, 5)
  const fileName = qaFileName(run, "pdf")

  useEffect(() => () => {
    if (pdf) URL.revokeObjectURL(pdf.url)
  }, [pdf])

  const ensurePdf = async () => {
    if (pdf) return pdf
    setBusy(true)
    try {
      const blob = await qaPdfBlob(run, statusOf)
      const next = { url: URL.createObjectURL(blob), size: blob.size }
      setPdf(next)
      return next
    } catch {
      toast.error("The PDF could not be generated. Please try again.")
      return null
    } finally {
      setBusy(false)
    }
  }

  const openPdf = async () => {
    const w = window.open("", "_blank")
    const p = await ensurePdf()
    if (!p) {
      w?.close()
      return
    }
    if (w) w.location.href = p.url
    else {
      const blob = await fetch(p.url).then((r) => r.blob())
      downloadBlob(fileName, blob)
    }
  }

  const savePdf = async () => {
    const p = await ensurePdf()
    if (!p) return
    const blob = await fetch(p.url).then((r) => r.blob())
    downloadBlob(fileName, blob)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-accent/50 px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold">Preview — delivery is simulated in this demo.</span> In production this email goes out automatically after every run, every 2 hours, with the QA report attached as a PDF.
        </span>
      </div>

      <article className="panel overflow-hidden">
        {/* Mail client chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </span>
          <span className="ml-2">Inbox</span>
          <span className="ml-auto flex items-center gap-3">
            <Star className="h-3.5 w-3.5" />
            <Reply className="h-3.5 w-3.5" />
          </span>
        </div>

        <header className="space-y-3 border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold leading-snug">{emailSubject(run)}</h2>
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-nav text-sm font-bold text-white" aria-hidden>
              QA
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <div>
                <span className="font-semibold">{brand.qaSenderName}</span> <span className="text-muted-foreground">&lt;{senderAddress()}&gt;</span>
              </div>
              <div className="text-muted-foreground">
                To: {QA_RECIPIENTS.map((r) => `${r.name} <${r.email}>`).join(", ")}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{formatDateTime(sent)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openPdf} disabled={busy} className="group inline-flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/50 hover:bg-accent/40">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-destructive/10 text-destructive">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}</span>
              <span>
                <span className="block text-sm font-medium">{fileName}</span>
                <span className="block text-xs text-muted-foreground">
                  PDF · {pdf ? `${Math.max(1, Math.round(pdf.size / 1024))} KB` : "4 sections"} · {busy ? "Generating…" : "Click to open"}
                </span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
            </button>
            <button onClick={savePdf} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent/50">
              <Download className="h-4 w-4" /> Download
            </button>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> 1 attachment
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto max-w-[680px] space-y-5 px-5 py-6 text-sm leading-relaxed">
          <p>Hi all,</p>
          <p>
            Here is the AI QA report for <strong>{COMPANY.name}</strong> from run {run.id} at {formatTime(run.at)} today. {runHeadline(run)}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Checks run", value: run.counts.run, tone: "" },
              { label: "Passed", value: run.counts.passed, tone: "text-success" },
              { label: "Warnings", value: run.counts.warnings, tone: "text-warning" },
              { label: "Failed", value: run.counts.failed, tone: "text-destructive" },
            ].map((t) => (
              <div key={t.label} className="rounded-lg border border-border p-3 text-center">
                <div className={cn("text-xl font-bold tabular-nums", t.tone)}>{t.value}</div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 font-semibold">
              {top.length ? `Top ${top.length} of ${run.exceptions.length} open exceptions` : "No open exceptions"}
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {top.map((i) => (
                <li key={i.id} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityPill severity={i.severity} />
                    <span className="font-semibold">
                      {i.id} · {i.title}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{oneLine(i.finding)}</p>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span>{KIND_LABEL[i.kind]}</span>
                    {i.amount > 0 && <Money value={i.amount} />}
                    {i.needsReview && <span className="font-semibold text-foreground">Needs a decision</span>}
                    <Link href={`/qa/exceptions/${i.id}`} className="font-medium text-primary hover:underline">
                      View evidence → {brand.domain}/qa/exceptions/{i.id}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {run.needsReview.length > 0 && (
            <p>
              <strong>{run.needsReview.length} item{run.needsReview.length === 1 ? " needs" : "s need"} a person to decide:</strong> {run.needsReview.map((i) => i.id).join(", ")}. Everything else can be fixed by the accounts team in Xero.
            </p>
          )}

          <p>
            The next run is at <strong>{formatTime(nextRunAt(run.at))}</strong>. Fixes made in Xero before then will be confirmed in that report.
          </p>

          <p>
            <Link href="/qa" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
              Open the AI QA dashboard
            </Link>
          </p>

          <p className="text-muted-foreground">— {brand.qaSenderName}</p>

          <footer className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>
              Sent automatically every 2 hours by the {brand.productName} AI QA engine to {QA_RECIPIENTS.length} recipients. Change recipients in{" "}
              <Link href="/settings#qa" className="text-primary hover:underline">
                Settings
              </Link>
              . Questions: {brand.supportEmail}
            </p>
            <PoweredBy />
          </footer>
        </div>
      </article>
    </div>
  )
}
