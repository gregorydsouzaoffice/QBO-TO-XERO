"use client"

import Link from "next/link"
import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Sparkles } from "lucide-react"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import LiveGate from "@/components/tracker/live-gate"
import TrackerTabs from "@/components/tracker/tracker-tabs"
import OverviewTab from "@/components/tracker/overview-tab"
import BankTab from "@/components/tracker/bank-tab"
import FiguresTab from "@/components/tracker/figures-tab"
import ReconciliationTab from "@/components/tracker/reconciliation-tab"
import DependenciesTab from "@/components/tracker/dependencies-tab"
import ExceptionsTab from "@/components/tracker/exceptions-tab"
import ReportingTab from "@/components/tracker/reporting-tab"
import CompareTab from "@/components/tracker/compare-tab"
import { conversionDate, formatShort, formatTime, parallelRunDay } from "@/lib/clock"
import { bankSummary } from "@/lib/data/bank"
import { lastRunAt, untilNextRun } from "@/lib/data/schedule"
import { COMPANY } from "@/lib/data/company"
import { useIssues } from "@/lib/demo-store"
import { isTrackerTab, type TrackerTab } from "@/lib/tracker/health"

const TITLE = "Financial tracker"
const DESCRIPTION = "QuickBooks and Xero side by side during the parallel run: bank, figures, reconciliation, source dependencies and discrepancies."

export default function TrackerPage() {
  return (
    <Suspense fallback={null}>
      <LiveGate title={TITLE} description={DESCRIPTION}>
        <Tracker />
      </LiveGate>
    </Suspense>
  )
}

function Tracker() {
  const params = useSearchParams()
  const raw = params.get("tab")
  const tab: TrackerTab = isTrackerTab(raw) ? raw : "overview"
  const { list } = useIssues()

  const badges = useMemo(() => {
    const open = list.filter((i) => i.status !== "resolved").length
    const bankExc = bankSummary().reduce((t, b) => t + b.exceptions, 0)
    return { exceptions: open, bank: bankExc }
  }, [list])

  return (
    <>
      <PageHeader
        eyebrow={COMPANY.name}
        title={TITLE}
        description={`${DESCRIPTION} Parallel run day ${parallelRunDay()}, since ${formatShort(conversionDate())}.`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">
              Last checked {formatTime(lastRunAt())} · next in {untilNextRun()}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/qa">
                <Sparkles /> AI QA report
              </Link>
            </Button>
          </div>
        }
      />
      <TrackerTabs active={tab} badges={badges} />
      <PageBody>
        {tab === "overview" && <OverviewTab />}
        {tab === "bank" && <BankTab />}
        {tab === "figures" && <FiguresTab />}
        {tab === "reconciliation" && <ReconciliationTab />}
        {tab === "dependencies" && <DependenciesTab />}
        {tab === "exceptions" && <ExceptionsTab />}
        {tab === "reporting" && <ReportingTab />}
        {tab === "compare" && <CompareTab />}
      </PageBody>
    </>
  )
}
