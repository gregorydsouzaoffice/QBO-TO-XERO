"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { CheckCircle2, CircleDashed, Link2Off, LogIn, ShieldCheck } from "lucide-react"
import { QuickBooksLogo, QuickBooksMark, XeroMark, XeroWordmark } from "@/components/brand"
import StepShell from "@/components/migration/step-shell"
import { Button } from "@/components/ui/button"
import { QBO_COMPANY, XERO_ORG } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"

const RETURN = "/migration/connect"
const qboHref = `/connect/quickbooks?return=${encodeURIComponent(RETURN)}`
const xeroHref = `/login/xero?return=${encodeURIComponent(RETURN)}`

export default function ConnectPage() {
  const router = useRouter()
  const { state, update } = useDemo()
  const { qbo, xero } = state

  const qboCompany = [{ realmId: QBO_COMPANY.realmId, name: QBO_COMPANY.name, edition: QBO_COMPANY.edition }, ...QBO_COMPANY.otherCompanies].find((c) => c.realmId === qbo.realmId) ?? QBO_COMPANY
  const xeroOrg = [{ tenantId: XERO_ORG.tenantId, name: XERO_ORG.name }, ...XERO_ORG.otherOrgs].find((o) => o.tenantId === xero.tenantId) ?? XERO_ORG

  const allConnected = qbo.connected && xero.connected
  const nextTarget = !qbo.connected
    ? { to: "Connect QuickBooks", href: qboHref }
    : !xero.connected
      ? { to: "Connect Xero", href: xeroHref }
      : { to: "Scope", href: "/migration/scope" }

  return (
    <StepShell
      step={1}
      requireConnections={false}
      title="Connect your systems"
      description="Sign in to QuickBooks Online to read your books, and to the new, empty Xero organisation they move into."
      next={{ to: nextTarget.to, onClick: () => router.push(nextTarget.href) }}
      footerNote={allConnected ? "All connected" : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* QuickBooks Online */}
        <SystemCard
          role="Source"
          logo={<QuickBooksLogo height={30} />}
          title="QuickBooks Online"
          text="We read your accounting data. Nothing in QuickBooks is changed, and it stays available for the parallel run."
          connected={qbo.connected}
          details={[
            ["Company", qboCompany.name],
            ["Realm ID", qbo.realmId],
            ["Edition", qboCompany.edition],
            ["Region", `${QBO_COMPANY.region} (GST, AUD)`],
          ]}
          action={
            qbo.connected ? (
              <DisconnectButton onClick={() => update((s) => ({ ...s, qbo: { ...s.qbo, connected: false } }))} label="Disconnect" />
            ) : (
              <Button onClick={() => router.push(qboHref)} className="w-full gap-2 sm:w-auto">
                <QuickBooksMark size={20} />
                Connect to QuickBooks
              </Button>
            )
          }
        />

        {/* Xero */}
        <SystemCard
          role="Accounting destination"
          logo={
            <span className="flex items-center gap-2">
              <XeroMark size={30} />
              <XeroWordmark height={20} />
            </span>
          }
          title="Xero"
          text="Your ledger moves here: accounts, contacts, invoices, bills, payments, bank, GST, tracking and attachments. Use a new, empty organisation."
          connected={xero.connected}
          details={[
            ["Organisation", xeroOrg.name],
            ["Short code", XERO_ORG.shortCode],
            ["Plan", XERO_ORG.plan],
            ["Year end, GST", `${XERO_ORG.financialYearEnd}, ${XERO_ORG.gstBasis.toLowerCase()} basis`],
          ]}
          action={
            xero.connected ? (
              <DisconnectButton onClick={() => update((s) => ({ ...s, xero: { ...s.xero, connected: false } }))} label="Disconnect" />
            ) : (
              <Button onClick={() => router.push(xeroHref)} className="w-full gap-2 sm:w-auto">
                <XeroMark size={20} />
                Connect to Xero
              </Button>
            )
          }
        />
      </div>

      <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Read-only from QuickBooks.</span> The QuickBooks connection asks only for permission to read your accounting data. You can
            disconnect at any time here, or from the Apps area in QuickBooks.
          </p>
          <p className="mt-1.5">The Xero connection can write data, because that is where your books are going. Disconnecting stops any further changes.</p>
        </div>
      </section>
    </StepShell>
  )
}

function SystemCard({
  role,
  logo,
  title,
  text,
  connected,
  off,
  details,
  action,
  toggle,
}: {
  role: string
  logo: ReactNode
  title: string
  text: string
  connected: boolean
  off?: boolean
  details: [string, string][]
  action: ReactNode
  toggle?: ReactNode
}) {
  return (
    <section className="panel flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{role}</div>
          <div className="mt-2 flex h-8 items-center">{logo}</div>
        </div>
        {off ? (
          <span className="pill-muted">Off</span>
        ) : connected ? (
          <span className="pill-success">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </span>
        ) : (
          <span className="pill-muted">
            <CircleDashed className="h-3 w-3" /> Not connected
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h2 className="sr-only">{title}</h2>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
        {toggle}
        {connected && !off && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/30 px-3.5 py-3 text-sm">
            {details.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="min-w-0 break-words font-medium tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto pt-1">{action}</div>
      </div>
    </section>
  )
}

function DisconnectButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" onClick={onClick} className="w-full gap-2 sm:w-auto">
      <Link2Off className="h-4 w-4" />
      {label}
    </Button>
  )
}
