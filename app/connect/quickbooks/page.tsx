"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { USER } from "@/lib/data/company"
import { INTUIT, IntuitButton, IntuitField, IntuitFrame, IntuitLink, connectHref, intuitInputClass } from "./intuit-frame"

/* Simulated Intuit sign-in: email, then password. */
function SignIn() {
  const router = useRouter()
  const params = useSearchParams()
  const ret = params.get("return")
  const [stage, setStage] = useState<"email" | "password">("email")
  const [email, setEmail] = useState(USER.email)
  const [password, setPassword] = useState("demo-password")
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (stage === "email") setStage("password")
      else router.push(connectHref("/connect/quickbooks/verify", ret))
    }, 600)
  }

  return (
    <IntuitFrame>
      {stage === "email" ? (
        <>
          <h1 className="text-center text-[26px] font-semibold">Sign in</h1>
          <p className="mt-2 text-center text-[14px]" style={{ color: INTUIT.muted }}>
            One account for everything Intuit, including QuickBooks.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-center text-[26px] font-semibold">Enter your password</h1>
          <p className="mt-2 text-center text-[14px]" style={{ color: INTUIT.muted }}>
            {email} · <IntuitLink onClick={() => setStage("email")}>Use a different account</IntuitLink>
          </p>
        </>
      )}

      <form className="mt-7 space-y-5" onSubmit={submit}>
        {stage === "email" ? (
          <>
            <IntuitField label="Email or user ID">
              <input type="text" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={intuitInputClass} style={{ borderColor: INTUIT.field }} />
            </IntuitField>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#0077c5]" />
              Remember me
            </label>
          </>
        ) : (
          <IntuitField label="Password">
            <input type="password" autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={intuitInputClass} style={{ borderColor: INTUIT.field }} />
          </IntuitField>
        )}

        <IntuitButton type="submit" disabled={busy} className="w-full">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {stage === "email" ? "Sign in" : "Continue"}
        </IntuitButton>
      </form>

      <div className="mt-6 space-y-2 text-center text-[14px]">
        {stage === "password" && (
          <p>
            <IntuitLink>Forgot your password?</IntuitLink>
          </p>
        )}
        <p style={{ color: INTUIT.muted }}>
          New to Intuit? <IntuitLink>Create an account</IntuitLink>
        </p>
        <p>
          <button type="button" onClick={() => router.push(ret ?? "/migration/connect")} className="text-[13px] hover:underline" style={{ color: INTUIT.muted }}>
            Cancel and go back
          </button>
        </p>
      </div>
    </IntuitFrame>
  )
}

export default function Page() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  )
}
