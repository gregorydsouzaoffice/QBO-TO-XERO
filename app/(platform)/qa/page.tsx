"use client"

import { ShieldCheck } from "lucide-react"
import { ChecksByArea } from "@/components/qa/checks-by-area"
import { ExceptionsTable } from "@/components/qa/exceptions-table"
import { Pipeline } from "@/components/qa/pipeline"
import { QaGate } from "@/components/qa/qa-gate"
import { ReportActions } from "@/components/qa/report-actions"
import { RunHistory } from "@/components/qa/run-history"
import { RunSummary, ScheduleCard } from "@/components/qa/run-summary"
import { useQa } from "@/components/qa/use-qa"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { conversionDate, formatShort, parallelRunDay } from "@/lib/clock"
import { COMPANY } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"

export default function QaPage() {
  return (
    <QaGate>
      <QaDashboard />
    </QaGate>
  )
}

function QaDashboard() {
  const qa = useQa()
  const { state } = useDemo()
  if (!qa.ready || !qa.latest) return null
  const latest = qa.latest
  const pausedReason = !state.qbo.connected || !state.xero.connected ? `Runs are paused because ${!state.qbo.connected ? "QuickBooks Online" : "Xero"} is disconnected. The results below are from the last run before that.` : undefined

  return (
    <>
      <PageHeader
        eyebrow={COMPANY.name}
        title="AI Financial QA"
        description={`The AI QA engine checks QuickBooks Online against Xero, the bank statements and Gojee every 2 hours. Parallel run day ${parallelRunDay()}, since ${formatShort(conversionDate())}.`}
        actions={<ReportActions run={latest} statusOf={qa.statusOf} />}
      />
      <PageBody>
        <Pipeline latest={latest} onRun={qa.runNow} pausedReason={pausedReason} />

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <RunSummary run={latest} />
          <ScheduleCard latest={latest} paused={!!pausedReason} />
        </div>

        <ChecksByArea run={latest} />

        <ExceptionsTable list={qa.list} statusOf={qa.statusOf} isPending={qa.isPending} />

        <RunHistory runs={qa.history} />

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Every figure above is computed from QuickBooks, Xero, the bank statements or Gojee and traces to the evidence on each exception. Fixes made in Xero are confirmed at the next run.
        </p>
      </PageBody>
    </>
  )
}
