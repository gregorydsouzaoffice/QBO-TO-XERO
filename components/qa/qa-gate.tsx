"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, FastForward, Sparkles } from "lucide-react"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { COMPANY } from "@/lib/data/company"
import { completedDemoState, useDemo } from "@/lib/demo-store"

/**
 * The AI QA engine compares QuickBooks with Xero during the parallel run, so it
 * only has something to check once the migration is complete.
 */
export function QaGate({ children }: { children: ReactNode }) {
  const { state, hydrated, update } = useDemo()
  if (!hydrated) return null
  if (state.migration.status === "completed") return <>{children}</>
  return (
    <>
      <PageHeader eyebrow={COMPANY.name} title="AI Financial QA" description="Checks QuickBooks Online against Xero, the bank and Gojee every 2 hours during the parallel run." />
      <PageBody>
        <section className="panel mx-auto max-w-2xl p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">The AI QA engine starts when Xero goes live</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Once the migration is complete, QuickBooks and Xero run in parallel. From then on the engine checks every figure, bank line and dependency every 2 hours and emails the report.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => update((s) => completedDemoState(s))}>
              <FastForward className="h-4 w-4" /> Demo: skip to the parallel run
            </Button>
            <Button asChild>
              <Link href="/migration">
                {state.migration.status === "in-progress" ? "Continue migration" : "Start migration"} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </PageBody>
    </>
  )
}
