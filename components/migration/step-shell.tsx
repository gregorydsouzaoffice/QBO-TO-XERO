"use client"

import Link from "next/link"
import { useEffect, type ReactNode } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react"
import NextButton from "@/components/next-button"
import PageHeader, { PageBody } from "@/components/shell/page-header"
import { Button } from "@/components/ui/button"
import { WIZARD_STEPS, stepHref } from "@/lib/data/migration"
import { useDemo } from "@/lib/demo-store"
import { cn } from "@/lib/utils"
import MigrationStepper from "./stepper"

/** Record the furthest step reached when a step page opens */
export function useEnterStep(n: number) {
  const { hydrated, update } = useDemo()
  useEffect(() => {
    if (!hydrated) return
    update((s) => (s.migration.step >= n ? s : { ...s, migration: { ...s.migration, step: n } }))
  }, [hydrated, n, update])
}

export interface NextAction {
  /** Caption, e.g. "Map" */
  to: string
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}

export default function StepShell({
  step,
  title,
  description,
  actions,
  next,
  nextSlot,
  footerNote,
  requireConnections = true,
  children,
}: {
  step: number
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  next?: NextAction
  /** Replaces the Next button (e.g. "Start parallel run") */
  nextSlot?: ReactNode
  footerNote?: ReactNode
  requireConnections?: boolean
  children: ReactNode
}) {
  const { state, hydrated } = useDemo()
  useEnterStep(step)
  if (!hydrated) return null

  const missing = [!state.qbo.connected && "QuickBooks Online", !state.xero.connected && "Xero"].filter(Boolean) as string[]
  const completed = state.migration.status === "completed"

  return (
    <>
      <PageHeader eyebrow={`Migration · Step ${step} of ${WIZARD_STEPS.length}`} title={title} description={description} actions={actions} />
      <PageBody>
        <MigrationStepper current={step} />

        {completed && (
          <Banner tone="success">
            This migration is finished and the parallel run has started. You are looking back at step {step}.{" "}
            <Link href="/migration" className="font-semibold underline-offset-2 hover:underline">
              Migration summary
            </Link>
          </Banner>
        )}
        {!completed && requireConnections && missing.length > 0 && (
          <Banner tone="warning">
            Connect {missing.join(" and ")} first. Figures below are from the pre-migration scan of the demo company.{" "}
            <Link href="/migration/connect" className="font-semibold underline-offset-2 hover:underline">
              Go to step 1
            </Link>
          </Banner>
        )}

        {children}

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-[10px] md:border md:bg-card md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {step > 1 ? (
              <Button variant="ghost" asChild>
                <Link href={stepHref(step - 1)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" asChild>
                <Link href="/migration">
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Overview
                </Link>
              </Button>
            )}
            <div className="flex flex-wrap items-center justify-end gap-3">
              {footerNote && <span className="text-xs text-muted-foreground">{footerNote}</span>}
              {nextSlot ?? (next && <NextButton onClick={next.onClick} to={next.to} disabled={next.disabled} busy={next.busy} />)}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  )
}

export function Banner({ tone, children }: { tone: "success" | "warning" | "info"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? AlertTriangle : Info
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[10px] border px-4 py-3 text-sm",
        tone === "success" && "border-success/30 bg-success/5 text-foreground",
        tone === "warning" && "border-warning/30 bg-warning/5 text-foreground",
        tone === "info" && "border-primary/25 bg-accent/50 text-foreground",
      )}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-primary")} />
      <div>{children}</div>
    </div>
  )
}

/** Pass / warning / fail pill with icon and text */
export function CheckPill({ status, label }: { status: "pass" | "warning" | "fail" | "info"; label?: string }) {
  if (status === "pass")
    return (
      <span className="pill-success">
        <CheckCircle2 className="h-3 w-3" /> {label ?? "Match"}
      </span>
    )
  if (status === "warning")
    return (
      <span className="pill-warning">
        <AlertTriangle className="h-3 w-3" /> {label ?? "Review"}
      </span>
    )
  if (status === "fail")
    return (
      <span className="pill-danger">
        <AlertTriangle className="h-3 w-3" /> {label ?? "Differs"}
      </span>
    )
  return (
    <span className="pill-info">
      <Info className="h-3 w-3" /> {label ?? "Info"}
    </span>
  )
}
