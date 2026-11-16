"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowRight, FastForward, Lock } from "lucide-react"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { completedDemoState, useDemo } from "@/lib/demo-store"

/**
 * Tracker and Reports compare QuickBooks with Xero, so they only make sense once
 * the migration is done. Until then, explain why and offer the demo shortcut.
 */
export default function LiveGate({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const { state, update, hydrated } = useDemo()
  if (!hydrated) return null
  if (state.migration.status === "completed") return <>{children}</>
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageBody>
        <section className="panel mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Available once Xero is live</h2>
          <p className="mt-1 text-sm text-muted-foreground">Finish the migration first. After go-live, QuickBooks and Xero run in parallel and this page compares them.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={() => update((s) => completedDemoState(s))}>
              <FastForward className="h-4 w-4" /> Demo: skip to the parallel run
            </Button>
            <Button asChild>
              <Link href="/migration">
                Go to migration <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </PageBody>
    </>
  )
}
