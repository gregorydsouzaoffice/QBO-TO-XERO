"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useParams } from "next/navigation"
import { CalendarDays, CircleDollarSign, Lightbulb, Radar, Search } from "lucide-react"
import { Money } from "@/components/figures"
import { ExceptionActions } from "@/components/qa/exception-actions"
import { AffectedAccounts, BackLinks, EffectsTable, EvidenceTable, ExceptionTimeline, LinkedChecks } from "@/components/qa/exception-parts"
import { QaGate } from "@/components/qa/qa-gate"
import { ConfidenceMeter, IssueStatusPill, ReviewFlag, SeverityPill } from "@/components/qa/status"
import { useQa } from "@/components/qa/use-qa"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { formatDateTime, formatShort } from "@/lib/clock"
import { KIND_LABEL } from "@/lib/data/issues"

export default function ExceptionPage() {
  return (
    <QaGate>
      <ExceptionDetail />
    </QaGate>
  )
}

function ExceptionDetail() {
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(String(params?.id ?? "")).toUpperCase()
  const qa = useQa()
  if (!qa.ready || !qa.latest) return null

  const issue = qa.list.find((i) => i.id === id)
  if (!issue)
    return (
      <PageBody>
        <section className="panel mx-auto max-w-xl p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Exception {id} not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">It may belong to a different company or an older parallel run.</p>
          <Link href="/qa" className="mt-4 inline-block font-medium text-primary hover:underline">
            Back to AI QA
          </Link>
        </section>
      </PageBody>
    )

  const status = qa.statusOf(issue)
  const pending = qa.isPending(issue)
  const linked = qa.latest.checks.filter((c) => c.check.watches.includes(issue.id))
  const resolvedAt = issue.resolvedAt ? formatDateTime(new Date(issue.resolvedAt)) : qa.fixes[issue.id] ? `${formatDateTime(new Date(qa.fixes[issue.id]))} (marked)` : "Not yet"

  return (
    <>
      <PageHeader
        eyebrow={
          <span>
            Exception {issue.id} · {issue.area}
          </span>
        }
        title={issue.title}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <SeverityPill severity={issue.severity} />
            <span className="pill-muted">{KIND_LABEL[issue.kind]}</span>
            <span className="pill-muted">{issue.area}</span>
            <IssueStatusPill status={status} pending={pending} />
          </span>
        }
        actions={<BackLinks />}
      />
      <PageBody>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Fact icon={CircleDollarSign} label="Amount" value={issue.amount > 0 ? <Money value={issue.amount} /> : "No dollar impact"} />
          <Fact icon={CalendarDays} label="Transaction date" value={formatShort(issue.date)} />
          <Fact icon={Radar} label="Detected at" value={formatDateTime(new Date(issue.detectedAt))} />
          <Fact icon={CalendarDays} label="Resolved at" value={resolvedAt} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="panel">
              <div className="panel-header flex-wrap">
                <div>
                  <div className="panel-title">Evidence</div>
                  <div className="text-xs text-muted-foreground">
                    {[issue.qboRef && `QuickBooks: ${issue.qboRef}`, issue.xeroRef && `Xero: ${issue.xeroRef}`, issue.sourceRef && `${issue.sourceLabel ?? "Source"}: ${issue.sourceRef}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <EvidenceTable issue={issue} />
            </section>

            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">What the engine found</div>
              </div>
              <div className="space-y-4 p-5">
                <p className="text-sm leading-relaxed">{issue.finding}</p>
                <div className="rounded-lg border border-primary/30 bg-accent/40 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-primary" /> Recommendation
                  </div>
                  <p className="mt-1 text-sm">{issue.recommendation}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Confidence</div>
                    <ConfidenceMeter value={issue.confidence} />
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold text-muted-foreground">Needs a person to decide</div>
                    <ReviewFlag needsReview={issue.needsReview} />
                    <span className="ml-2 text-xs text-muted-foreground">{issue.needsReview ? "Judgement needed before fixing" : "The accounts team can fix it in Xero"}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="panel">
                <div className="panel-header">
                  <div className="panel-title">Affected accounts</div>
                  <span className="text-xs text-muted-foreground">QuickBooks → Xero</span>
                </div>
                <AffectedAccounts issue={issue} />
              </section>
              <section className="panel">
                <div className="panel-header">
                  <div className="panel-title">Effect on Xero vs QuickBooks</div>
                </div>
                <EffectsTable issue={issue} />
              </section>
            </div>
          </div>

          <div className="space-y-6">
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">Actions</div>
              </div>
              <ExceptionActions key={issue.id} issue={issue} status={status} pending={pending} setStatus={qa.setStatus} />
            </section>
            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">Timeline</div>
              </div>
              <ExceptionTimeline issue={issue} status={status} fixes={qa.fixes} history={qa.history} />
            </section>
            {linked.length > 0 && (
              <section className="panel">
                <div className="panel-header">
                  <div className="panel-title">Checks that raised it</div>
                  <span className="text-xs text-muted-foreground">at {qa.latest.id}</span>
                </div>
                <LinkedChecks checks={linked} />
              </section>
            )}
          </div>
        </div>
      </PageBody>
    </>
  )
}

function Fact({ icon: Icon, label, value }: { icon: typeof Radar; label: string; value: ReactNode }) {
  return (
    <div className="panel flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  )
}
