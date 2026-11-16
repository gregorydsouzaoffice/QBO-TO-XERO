"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, CircleSlash, Landmark, Link2, Unplug } from "lucide-react"
import { QuickBooksMark, XeroMark } from "@/components/brand"
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
import { formatTime } from "@/lib/clock"
import { feedStatuses } from "@/lib/data/bank"
import { BANK_ACCOUNTS, QBO_COMPANY, XERO_ORG } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"

type Target = "qbo" | "xero"

const NAME: Record<Target, string> = { qbo: "QuickBooks Online", xero: "Xero" }
const DISCONNECT_TEXT: Record<Target, string> = {
  qbo: "The AI QA engine stops comparing QuickBooks with Xero until you reconnect. Nothing is deleted in QuickBooks, and you can reconnect at any time through Intuit's sign-in.",
  xero: "The AI QA engine, the tracker and reports stop receiving Xero data until you reconnect.",
}

export function Connections() {
  const { state, update } = useDemo()
  const router = useRouter()
  const [confirm, setConfirm] = useState<Target | null>(null)
  const [feeds, setFeeds] = useState<Record<string, boolean>>(() => Object.fromEntries(BANK_ACCOUNTS.map((b) => [b.code, true])))

  const disconnect = (t: Target) => {
    update((s) => {
      if (t === "qbo") return { ...s, qbo: { ...s.qbo, connected: false } }
      return { ...s, xero: { ...s.xero, connected: false } }
    })
    toast(`${NAME[t]} disconnected`, { description: "Simulated in this demo. Reconnect from this page." })
  }

  const connect = (t: Target) => {
    if (t === "qbo") return router.push("/connect/quickbooks?return=/settings")
    update((s) => ({ ...s, xero: { ...s.xero, connected: true } }))
    toast.success(`${NAME[t]} connected`, { description: "Simulated sign-in for this demo." })
  }

  const feedList = feedStatuses()

  return (
    <section className="panel" id="connections">
      <div className="panel-header">
        <div>
          <div className="panel-title">Connections</div>
          <div className="text-xs text-muted-foreground">The systems the platform reads. QuickBooks stays read-only during the parallel run.</div>
        </div>
      </div>
      <ul className="divide-y divide-border">
        <ConnectionRow
          logo={<QuickBooksMark size={36} />}
          name="QuickBooks Online"
          connected={state.qbo.connected}
          details={[QBO_COMPANY.name, `Company ID (realm) ${state.qbo.realmId || QBO_COMPANY.realmId}`, `${QBO_COMPANY.edition} · ${QBO_COMPANY.region}`]}
          connectLabel="Connect to QuickBooks"
          onConnect={() => connect("qbo")}
          onDisconnect={() => setConfirm("qbo")}
        />
        <ConnectionRow
          logo={<XeroMark size={36} />}
          name="Xero"
          connected={state.xero.connected}
          details={[`${XERO_ORG.name} · ${XERO_ORG.shortCode}`, `${XERO_ORG.plan} · ${XERO_ORG.baseCurrency} · FY ends ${XERO_ORG.financialYearEnd} · GST ${XERO_ORG.gstBasis.toLowerCase()}`, `Tenant ${state.xero.tenantId || XERO_ORG.tenantId}`]}
          connectLabel="Connect Xero"
          onConnect={() => connect("xero")}
          onDisconnect={() => setConfirm("xero")}
        />
      </ul>

      <div className="border-t border-border">
        <div className="px-5 pb-1 pt-4 text-xs font-semibold text-muted-foreground">Bank feeds</div>
        <ul className="divide-y divide-border">
          {feedList.map((f) => {
            const on = feeds[f.code]
            const acct = BANK_ACCOUNTS.find((b) => b.code === f.code)!
            return (
              <li key={f.code} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Landmark className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {acct.number} · {f.feed} · QBO {acct.code} / Xero {acct.xeroCode}
                    {on && ` · refreshed ${formatTime(f.lastRefresh)}`}
                  </div>
                  {on && f.status !== "connected" && <div className="text-xs text-warning">{f.note}</div>}
                </div>
                {!on ? (
                  <span className="pill-muted">
                    <CircleSlash className="h-3 w-3" /> Disconnected
                  </span>
                ) : f.status === "connected" ? (
                  <span className="pill-success">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="pill-warning">
                    <AlertTriangle className="h-3 w-3" /> Gap found
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFeeds((s) => ({ ...s, [f.code]: !on }))
                    toast(`${f.name} feed ${on ? "disconnected" : "reconnected"}`, { description: "Simulated in this demo." })
                  }}
                >
                  {on ? <Unplug className="h-4 w-4" /> : <Link2 className="h-4 w-4" />} {on ? "Disconnect" : "Reconnect"}
                </Button>
              </li>
            )
          })}
        </ul>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {confirm ? NAME[confirm] : ""}?</AlertDialogTitle>
            <AlertDialogDescription>{confirm ? DISCONNECT_TEXT[confirm] : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirm) disconnect(confirm)
                setConfirm(null)
              }}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function ConnectionRow({
  logo,
  name,
  connected,
  details,
  connectLabel,
  connectDisabled,
  connectHint,
  onConnect,
  onDisconnect,
}: {
  logo: ReactNode
  name: string
  connected: boolean
  details: string[]
  connectLabel: string
  connectDisabled?: boolean
  connectHint?: string
  onConnect: () => void
  onDisconnect: () => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      {logo}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{name}</span>
          {connected ? (
            <span className="pill-success">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="pill-muted">
              <CircleSlash className="h-3 w-3" /> Not connected
            </span>
          )}
        </div>
        {details.map((d) => (
          <div key={d} className="truncate text-xs text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-end gap-1">
        {connected ? (
          <Button variant="outline" onClick={onDisconnect}>
            <Unplug className="h-4 w-4" /> Disconnect
          </Button>
        ) : (
          <Button onClick={onConnect} disabled={connectDisabled}>
            <Link2 className="h-4 w-4" /> {connectLabel}
          </Button>
        )}
        {connectHint && <span className="text-xs text-muted-foreground">{connectHint}</span>}
      </div>
    </li>
  )
}
