"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { QBO_COMPANY, USER } from "@/lib/data/company"
import { INTUIT, IntuitButton, IntuitFrame, connectHref } from "../intuit-frame"

/* Simulated Intuit company picker: every QuickBooks company this login can see. */
function CompanyPicker() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const companies = [{ realmId: QBO_COMPANY.realmId, name: QBO_COMPANY.name, edition: QBO_COMPANY.edition }, ...QBO_COMPANY.otherCompanies]
  const [selected, setSelected] = useState(QBO_COMPANY.realmId)
  const [busy, setBusy] = useState(false)

  return (
    <IntuitFrame wide>
      <h1 className="text-center text-[24px] font-semibold">Select a company</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: INTUIT.muted }}>
        Signed in as {USER.email}
      </p>

      <fieldset className="mt-6 space-y-2.5">
        <legend className="sr-only">QuickBooks companies</legend>
        {companies.map((c) => {
          const on = c.realmId === selected
          return (
            <label
              key={c.realmId}
              className="flex cursor-pointer items-center gap-3 rounded-[4px] border px-4 py-3 transition-colors"
              style={{ borderColor: on ? INTUIT.blue : INTUIT.line, background: on ? "#f0f7fc" : "#fff", boxShadow: on ? `inset 0 0 0 1px ${INTUIT.blue}` : undefined }}
            >
              <input type="radio" name="company" value={c.realmId} checked={on} onChange={() => setSelected(c.realmId)} className="sr-only" />
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: on ? INTUIT.blue : INTUIT.field }}>
                {on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: INTUIT.blue }} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{c.name}</span>
                <span className="block text-[12px]" style={{ color: INTUIT.muted }}>
                  {c.edition} · Company ID {c.realmId}
                </span>
              </span>
              {c.realmId === QBO_COMPANY.realmId && (
                <span className="hidden items-center gap-1 text-[12px] font-medium sm:inline-flex" style={{ color: INTUIT.muted }}>
                  <Check className="h-3.5 w-3.5" /> Last used
                </span>
              )}
            </label>
          )
        })}
      </fieldset>

      {selected !== QBO_COMPANY.realmId && (
        <p className="mt-3 text-[12px]" style={{ color: INTUIT.muted }}>
          This demo&apos;s figures are for {QBO_COMPANY.name} whichever company you pick.
        </p>
      )}

      <IntuitButton
        type="button"
        disabled={busy}
        className="mt-6 w-full"
        onClick={() => {
          setBusy(true)
          setTimeout(() => router.push(connectHref("/connect/quickbooks/consent", ret, { realm: selected })), 500)
        }}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Next
      </IntuitButton>
    </IntuitFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <CompanyPicker />
    </Suspense>
  )
}
