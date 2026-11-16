"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { brand } from "@/lib/brand"
import { USER, XERO_ORG } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"
import { XERO, XeroField, XeroFrame, XeroPrimaryButton, xeroInputClass } from "../xero-frame"

/*
 * Replica of Xero's app authorisation screen (demo only).
 *   mode=signin  → "Sign in with Xero" for the platform itself (openid profile email)
 *   default      → connect the Xero organisation the QuickBooks data migrates into
 * Real build: https://login.xero.com/identity/connect/authorize with these scopes.
 */

const SIGNIN_SCOPES = ["View your name, email address and user profile"]

const CONNECT_SCOPES = [
  "View your name, email address and user profile",
  "View and manage your organisation settings (chart of accounts, tax rates, tracking)",
  "View and manage your contacts",
  "View and manage your business transactions and bank statements",
  "View your reports (trial balance, P&L, balance sheet, aged receivables and payables)",
  "Read and add attachments",
]

function Consent() {
  const router = useRouter()
  const params = useSearchParams()
  const signin = params.get("mode") === "signin"
  const ret = params.get("return") ?? (signin ? "/home" : "/migration/connect")
  const { state, update } = useDemo()
  const [selected, setSelected] = useState(XERO_ORG.tenantId)
  const [busy, setBusy] = useState(false)
  const orgs = [{ tenantId: XERO_ORG.tenantId, name: XERO_ORG.name }, ...XERO_ORG.otherOrgs]

  const allow = () => {
    setBusy(true)
    setTimeout(() => {
      if (signin) {
        update((s) => ({ ...s, signedIn: true }))
        router.push(ret)
        return
      }
      update((s) => ({ ...s, xero: { connected: true, tenantId: selected } }))
      router.push(ret)
    }, 800)
  }

  return (
    <XeroFrame>
      <div className="flex items-center gap-3">
        <span className="grid h-12 min-w-12 place-items-center rounded-xl bg-[#062a4d] px-3 text-[15px] font-bold text-white shadow-sm">{brand.productName}</span>
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#a6b0bb]" />
          ))}
        </span>
        <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[#13b5ea]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Xero-logo.png" alt="Xero" className="h-12 w-12 scale-[1.92]" />
        </span>
      </div>

      <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-[-0.01em]">{signin ? `Sign in to ${brand.productName} with Xero` : "Allow access to your organisation"}</h1>
      <p className="mt-3 text-[17px]" style={{ color: XERO.text }}>
        <strong>{brand.productName}</strong> {signin ? "wants to confirm who you are." : "wants to connect to Xero."} Logged in as <strong>{USER.email}</strong>
      </p>

      {!signin && (
        <div className="mt-6">
          <XeroField label="Organisation">
            <span className="relative block">
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className={`${xeroInputClass} appearance-none pr-10`} style={{ borderColor: XERO.field }}>
                {orgs.map((o) => (
                  <option key={o.tenantId} value={o.tenantId}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: XERO.muted }} />
            </span>
          </XeroField>
          <p className="mt-2 text-[14px]" style={{ color: XERO.muted }}>
            Choose the new, empty organisation set up for this migration.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-[10px] border px-6 py-5" style={{ borderColor: XERO.line }}>
        <div className="text-[16px] font-bold">This app will be able to:</div>
        <ul className="mt-3 space-y-2 text-[16px]" style={{ color: XERO.text }}>
          {(signin ? SIGNIN_SCOPES : CONNECT_SCOPES).map((s) => (
            <li key={s} className="flex gap-2.5">
              <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: XERO.blue }} strokeWidth={3} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 text-[14px] leading-relaxed" style={{ color: XERO.muted }}>
        By allowing access, you agree to the transfer of your data between Xero and this app in accordance with Xero&apos;s terms of use. You can disconnect at any time from Connected apps in Xero.
      </p>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={() => router.push(signin ? "/login" : ret)} className="text-[19px] hover:underline" style={{ color: XERO.blue }}>
          Cancel
        </button>
        <XeroPrimaryButton type="button" disabled={busy} onClick={allow}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Allow access
        </XeroPrimaryButton>
      </div>
    </XeroFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  )
}
