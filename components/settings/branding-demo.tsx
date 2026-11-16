"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Eraser, FastForward, Info, RotateCcw } from "lucide-react"
import { PoweredBy, ProductWordmark } from "@/components/brand"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { brand } from "@/lib/brand"
import { completedDemoState, useDemo } from "@/lib/demo-store"

/** Product name and logo are still open, so these are shown read-only from lib/brand.ts */
export function Branding() {
  const rows: { label: string; value: ReactNode; pending?: boolean }[] = [
    { label: "Product name", value: brand.productName, pending: true },
    { label: "Tagline", value: brand.tagline, pending: true },
    { label: "Logo", value: brand.productLogoSrc ? <ProductWordmark /> : "Not supplied yet: the name is shown as plain text", pending: !brand.productLogoSrc },
    { label: "QA email sender", value: brand.qaSenderName, pending: true },
    { label: "Web address", value: brand.domain, pending: true },
    { label: "Support email", value: brand.supportEmail, pending: true },
    { label: "Powered by", value: <PoweredBy /> },
  ]
  return (
    <section className="panel" id="branding">
      <div className="panel-header">
        <div>
          <div className="panel-title">Branding</div>
          <div className="text-xs text-muted-foreground">Shown on every screen, email and PDF.</div>
        </div>
        <span className="pill-muted">Read-only</span>
      </div>
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr_auto] sm:items-center">
            <dt className="text-xs font-semibold text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 text-sm">{r.value}</dd>
            {r.pending ? <span className="pill-warning w-fit">Placeholder</span> : <span />}
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The product name and logo are still to be decided. When they are, they are set in one place and flow into every screen, the QA email and the PDF and Excel reports.
      </p>
    </section>
  )
}

export function DemoControls() {
  const { state, update, reset } = useDemo()
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const changes = Object.keys(state.issueStatus).length

  return (
    <section className="panel" id="demo">
      <div className="panel-header">
        <div>
          <div className="panel-title">Demo controls</div>
          <div className="text-xs text-muted-foreground">For presenting. Nothing here exists in the real product.</div>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Skip to the parallel run</div>
            <div className="text-xs text-muted-foreground">Connects everything and marks the migration complete.</div>
          </div>
          <Button
            variant="outline"
            disabled={state.migration.status === "completed" && state.qbo.connected && state.xero.connected && state.gojee.connected}
            onClick={() => {
              update((s) => completedDemoState(s))
              toast.success("Skipped to the parallel run")
            }}
          >
            <FastForward className="h-4 w-4" /> Skip ahead
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Undo exception status changes</div>
            <div className="text-xs text-muted-foreground">{changes ? `${changes} exception${changes === 1 ? "" : "s"} changed in this session.` : "No changes in this session."}</div>
          </div>
          <Button
            variant="outline"
            disabled={!changes}
            onClick={() => {
              update((s) => ({ ...s, issueStatus: {} }))
              toast("Exception statuses restored")
            }}
          >
            <Eraser className="h-4 w-4" /> Undo changes
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Restart the demo</div>
            <div className="text-xs text-muted-foreground">Signs out and starts again from the login screen.</div>
          </div>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)}>
            <RotateCcw className="h-4 w-4" /> Restart
          </Button>
        </div>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart the demo?</AlertDialogTitle>
            <AlertDialogDescription>Connections, migration progress, exception changes and manual QA runs are cleared. You will be taken back to the login screen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                try {
                  sessionStorage.removeItem("ledgershift:qa:v1")
                } catch {
                  // ignore
                }
                reset()
                router.push("/login")
              }}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
