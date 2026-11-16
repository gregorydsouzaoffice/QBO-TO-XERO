"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, ShieldCheck, Smartphone } from "lucide-react"
import { ProductWordmark } from "@/components/brand"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { USER } from "@/lib/data/company"
import { useDemo } from "@/lib/demo-store"

/** Two-step verification after email + password (demo: any 6 digits). */
export default function VerifyPage() {
  const router = useRouter()
  const { update } = useDemo()
  const [code, setCode] = useState("482913")
  const [busy, setBusy] = useState(false)

  const submit = () => {
    setBusy(true)
    setTimeout(() => {
      update((s) => ({ ...s, signedIn: true }))
      router.push("/home")
    }, 700)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <ProductWordmark className="text-xl" />
      </div>
      <div className="panel w-full max-w-[420px] p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary">
          <Smartphone className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Two-step verification</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app for <strong className="text-foreground">{USER.email}</strong>.
        </p>
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <button type="submit" disabled={code.length !== 6 || busy} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground hover:bg-[hsl(203_100%_31%)] disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify and continue
          </button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <a href="#" className="font-medium text-primary hover:underline">
            Use a recovery code
          </a>
        </div>
      </div>
    </div>
  )
}
