"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Loader2, Lock } from "lucide-react"
import { brand } from "@/lib/brand"
import { QBO_COMPANY } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"
import { INTUIT, IntuitButton, IntuitFrame } from "../intuit-frame"

/* Simulated Intuit consent screen for scope com.intuit.quickbooks.accounting. */
function Consent() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return") ?? "/migration/connect"
  const realm = params.get("realm") ?? QBO_COMPANY.realmId
  const company = [{ realmId: QBO_COMPANY.realmId, name: QBO_COMPANY.name }, ...QBO_COMPANY.otherCompanies].find((c) => c.realmId === realm) ?? QBO_COMPANY
  const { update } = useDemo()
  const [busy, setBusy] = useState(false)

  const connect = () => {
    setBusy(true)
    setTimeout(() => {
      update((s) => ({ ...s, qbo: { connected: true, realmId: company.realmId } }))
      router.push(ret)
    }, 900)
  }

  return (
    <IntuitFrame wide>
      <h1 className="text-center text-[22px] font-semibold leading-snug">
        <span className="font-bold">{brand.productName}</span> wants to connect to your company
      </h1>
      <p className="mt-2 text-center text-[15px] font-medium">{company.name}</p>
      <p className="text-center text-[12px]" style={{ color: INTUIT.muted }}>
        Company ID {company.realmId}
      </p>

      <div className="mt-6 rounded-[4px] border px-5 py-4" style={{ borderColor: INTUIT.line }}>
        <div className="text-[14px] font-semibold">{brand.productName} will be able to:</div>
        <div className="mt-3 flex gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: "#e8f3fa", color: INTUIT.blue }}>
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-medium">Read your accounting data</div>
            <div className="text-[13px]" style={{ color: INTUIT.muted }}>
              Accounts, customers, vendors, items, transactions, reports and attachments.
            </div>
            <code className="mt-1.5 inline-block rounded bg-[#f4f5f8] px-1.5 py-0.5 text-[12px]" style={{ color: INTUIT.ink }}>
              com.intuit.quickbooks.accounting
            </code>
          </div>
        </div>
      </div>

      <p className="mt-5 flex gap-2 text-[12px] leading-relaxed" style={{ color: INTUIT.muted }}>
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          By selecting Connect, you allow Intuit to share this company&apos;s data with {brand.productName} under its terms of service and privacy policy. You can disconnect at any time from the Apps area in QuickBooks or from {brand.productName}.
        </span>
      </p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <IntuitButton type="button" variant="secondary" onClick={() => router.push(ret)} disabled={busy}>
          Cancel
        </IntuitButton>
        <IntuitButton type="button" onClick={connect} disabled={busy} className="sm:min-w-[140px]">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Connect
        </IntuitButton>
      </div>
    </IntuitFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  )
}
