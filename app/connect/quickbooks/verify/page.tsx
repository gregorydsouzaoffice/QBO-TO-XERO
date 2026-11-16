"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Smartphone } from "lucide-react"
import { INTUIT, IntuitButton, IntuitFrame, IntuitLink, connectHref, intuitInputClass } from "../intuit-frame"

/* Simulated Intuit verification: 6-digit code sent by text message. */
const DEMO_CODE = "482913"
const PHONE_TAIL = "184"

function Verify() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const [code, setCode] = useState("")
  const [autofilled, setAutofilled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)

  // The demo "receives" the text after a moment, like the phone's code autofill
  useEffect(() => {
    const t = setTimeout(() => {
      setCode((c) => (c ? c : DEMO_CODE))
      setAutofilled(true)
    }, 1400)
    return () => clearTimeout(t)
  }, [])

  const valid = /^\d{6}$/.test(code)

  return (
    <IntuitFrame>
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full" style={{ background: "#e8f3fa", color: INTUIT.blue }}>
        <Smartphone className="h-6 w-6" />
      </div>
      <h1 className="text-center text-[24px] font-semibold">Let&apos;s make sure it&apos;s you</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: INTUIT.muted }}>
        Enter the 6-digit code we sent to (•••) •••-•{PHONE_TAIL}.
      </p>

      <form
        className="mt-7 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          setBusy(true)
          setTimeout(() => router.push(connectHref("/connect/quickbooks/company", ret)), 700)
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-medium">Verification code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${intuitInputClass} text-center text-[22px] tracking-[0.5em]`}
            style={{ borderColor: INTUIT.field }}
            aria-describedby="code-hint"
          />
          <span id="code-hint" className="mt-1.5 block text-[12px]" style={{ color: INTUIT.muted }}>
            {autofilled ? "Code filled in from the demo text message." : "Waiting for the text message…"}
          </span>
        </label>

        <IntuitButton type="submit" disabled={!valid || busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </IntuitButton>
      </form>

      <p className="mt-6 text-center text-[14px]" style={{ color: INTUIT.muted }}>
        {resent ? "We sent a new code." : "Didn't get it?"} <IntuitLink onClick={() => setResent(true)}>Resend code</IntuitLink>
      </p>
    </IntuitFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  )
}
